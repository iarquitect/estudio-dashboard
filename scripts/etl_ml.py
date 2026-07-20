#!/usr/bin/env python3
"""
ETL + ML pipeline — Dashboard Estudio Mario Isgró
SSOT: Google Sheets ID 1gqb65zbZzcZCTiua5AlXFzANr8jXpNtTLWKYqFUDoeo
Output: public/dashboard_data.json
"""

import json
import os
import sys
from datetime import datetime, timezone

import gspread
import numpy as np
import pandas as pd
from google.oauth2.service_account import Credentials

# Silenciar el FutureWarning de downcasting en pandas ≥ 2.1
pd.set_option("future.no_silent_downcasting", True)
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import KFold, cross_val_predict, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# ── Config ────────────────────────────────────────────────────────────────────

SHEET_ID    = "1gqb65zbZzcZCTiua5AlXFzANr8jXpNtTLWKYqFUDoeo"
OUTPUT_PATH = "public/dashboard_data.json"
SCOPES      = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

# Sheet names (exact, UTF-8)
SH_RAW    = "Sprint Estudio Mario Isgró"
SH_LOG    = "Log_Registros"
SH_PER    = "Ref_Personas"
SH_PROY   = "Ref_Proyectos"
SH_TPROY  = "Ref_Tipo_Proyectos"
SH_CAT    = "Ref_Categoría"
SH_HERR   = "Ref_Herramientas"
SH_INCER  = "Ref_Incertidumbre"
SH_COMP   = "Ref_Complejidad"

# ── Auth ──────────────────────────────────────────────────────────────────────

def auth_sheets() -> gspread.Client:
    raw = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not raw:
        raise EnvironmentError("GOOGLE_CREDENTIALS_JSON not set")
    creds = Credentials.from_service_account_info(json.loads(raw), scopes=SCOPES)
    return gspread.authorize(creds)


# ── I/O ───────────────────────────────────────────────────────────────────────

def ws_to_df(sh: gspread.Spreadsheet, name: str) -> pd.DataFrame:
    rows = sh.worksheet(name).get_all_values()
    if len(rows) < 2:
        return pd.DataFrame()
    headers, data = rows[0], rows[1:]
    df = pd.DataFrame(data, columns=headers)
    df = df.replace("", np.nan)
    return df


def load_sheets(sh):
    return {
        "raw":   ws_to_df(sh, SH_RAW),
        "log":   ws_to_df(sh, SH_LOG),
        "per":   ws_to_df(sh, SH_PER),
        "proy":  ws_to_df(sh, SH_PROY),
        "tproy": ws_to_df(sh, SH_TPROY),
        "cat":   ws_to_df(sh, SH_CAT),
        "herr":  ws_to_df(sh, SH_HERR),
        "incer": ws_to_df(sh, SH_INCER),
        "comp":  ws_to_df(sh, SH_COMP),
    }


# ── ETL helpers ───────────────────────────────────────────────────────────────

def build_lookup(df: pd.DataFrame, pk_col: str, label_col: str, zero="No aplica") -> dict:
    lk = {0: zero}
    for _, row in df.iterrows():
        try:
            lk[int(float(row[pk_col]))] = str(row[label_col]).strip()
        except (ValueError, TypeError):
            pass
    return lk


def safe_int(v, default=0) -> int:
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return default


def extract_sprint_metadata(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Forward-fill sprint label (col 0) and extract fecha/día/tarea/comentarios
    keyed by REGISTRO (= ID_Registro).
    """
    df = raw.copy()
    sprint_col = df.columns[0]   # might be "1", empty, or "Sprint"
    df["_sprint"] = df[sprint_col].replace(np.nan, None).ffill()

    # Normalize casing: "SPRINT 2" → "Sprint 2"
    df["_sprint"] = df["_sprint"].apply(
        lambda x: " ".join(w.capitalize() for w in str(x).split()) if pd.notna(x) else x
    )

    # Find REGISTRO column
    reg_col = next((c for c in df.columns if "REGISTRO" in str(c).upper()), None)
    if reg_col is None:
        return pd.DataFrame(columns=["id_registro", "sprint"])

    df = df.dropna(subset=[reg_col])
    df["id_registro"] = pd.to_numeric(df[reg_col], errors="coerce")
    df = df.dropna(subset=["id_registro"])
    df["id_registro"] = df["id_registro"].astype(int)

    rename = {"_sprint": "sprint"}

    fecha_col = next((c for c in df.columns if "FECHA" in str(c).upper()), None)
    if fecha_col:
        df[fecha_col] = pd.to_datetime(df[fecha_col], errors="coerce", dayfirst=True)
        rename[fecha_col] = "fecha"

    dia_col = next((c for c in df.columns if str(c).upper() in ("DÍA", "DIA", "DÍA")), None)
    if dia_col:
        rename[dia_col] = "dia"

    tarea_col = next((c for c in df.columns if "TAREA" in str(c).upper()), None)
    if tarea_col:
        rename[tarea_col] = "tarea"

    com_col = next((c for c in df.columns if "COMENTARIO" in str(c).upper()), None)
    if com_col:
        rename[com_col] = "comentarios"

    cols = ["id_registro"] + [c for c in rename if c != "_sprint" and c in df.columns] + ["_sprint"]
    out = df[[c for c in cols if c in df.columns]].rename(columns=rename)
    return out.drop_duplicates(subset=["id_registro"])


# ── Core ETL ──────────────────────────────────────────────────────────────────

def run_etl(sheets: dict) -> pd.DataFrame:
    lk_proy  = build_lookup(sheets["proy"],  "ID_Proyecto (PK)",  "Nombre_Proyecto")
    lk_per   = build_lookup(sheets["per"],   "ID_Persona (PK)",   "Nombre",  "Sin asignar")
    lk_tproy = build_lookup(sheets["tproy"], "ID_Tipo_Proy (PK)", "Tipo_Proyecto")
    lk_cat   = build_lookup(sheets["cat"],   "ID_Tipo_Cat",       "Tipo_Categoría")
    lk_herr  = build_lookup(sheets["herr"],  "ID_Tipo_Herr",      "Tipo_Herramientas")
    lk_incer = build_lookup(sheets["incer"], "ID_Tipo_Incer",     "Tipo_Incertidumbre")
    lk_comp  = build_lookup(sheets["comp"],  "ID_Tipo_Comp",      "Tipo_Complejidad")

    sprint_meta = extract_sprint_metadata(sheets["raw"])

    df = sheets["log"].copy()

    # Coerce all numeric columns
    int_fk = ["ID_Proy (PK)", "ID_Tipo_Proy (PK)", "ID_Tipo_Cat", "ID_Tipo_Herr"]
    flt_fk = ["ID_Registro (PK)", "ID_Persona (PK)", "ID_Tipo_Incer",
               "ID_Tipo_Comp", "Puntos (Est)", "Horas (Real) [Y]"]

    for c in int_fk:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
    for c in flt_fk:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop rows without both target and feature
    df = df.dropna(subset=["Puntos (Est)", "Horas (Real) [Y]"])
    df["ID_Registro (PK)"] = df["ID_Registro (PK)"].fillna(-1).astype(int)
    df["ID_Persona (PK)"]  = df["ID_Persona (PK)"].fillna(0).astype(int)
    df["ID_Tipo_Incer"]    = df["ID_Tipo_Incer"].fillna(0).astype(int) if "ID_Tipo_Incer" in df.columns else 0
    df["ID_Tipo_Comp"]     = df["ID_Tipo_Comp"].fillna(0).astype(int)  if "ID_Tipo_Comp"  in df.columns else 0

    # Apply lookups
    df["proyecto"]          = df["ID_Proy (PK)"].map(lk_proy).fillna("Desconocido")
    df["responsable"]       = df["ID_Persona (PK)"].map(lk_per).fillna("Sin asignar")
    df["tipo_proyecto"]     = df["ID_Tipo_Proy (PK)"].map(lk_tproy).fillna("Desconocido")
    df["categoria"]         = df["ID_Tipo_Cat"].map(lk_cat).fillna("Desconocido")
    df["herramienta"]       = df["ID_Tipo_Herr"].map(lk_herr).fillna("No aplica")
    df["nivel_incer"]       = df["ID_Tipo_Incer"]
    df["nivel_incer_label"] = df["ID_Tipo_Incer"].map(lk_incer)
    df["nivel_comp"]        = df["ID_Tipo_Comp"]
    df["nivel_comp_label"]  = df["ID_Tipo_Comp"].map(lk_comp)
    df["diferencia"]        = (df["Horas (Real) [Y]"] - df["Puntos (Est)"]).round(4)

    # Join sprint metadata
    df = df.merge(sprint_meta, left_on="ID_Registro (PK)", right_on="id_registro", how="left")

    return df


# ── ML ────────────────────────────────────────────────────────────────────────

CAT_FEATURES = ["categoria", "herramienta", "tipo_proyecto", "responsable"]
NUM_FEATURES  = ["Puntos (Est)", "nivel_incer", "nivel_comp"]


def build_model() -> Pipeline:
    prep = ColumnTransformer([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT_FEATURES),
        ("num", "passthrough", NUM_FEATURES),
    ])
    return Pipeline([
        ("prep", prep),
        ("rf", RandomForestRegressor(n_estimators=300, max_features="sqrt",
                                      random_state=42, n_jobs=-1)),
    ])


def train_and_predict(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    all_feats = CAT_FEATURES + NUM_FEATURES
    valid = df.dropna(subset=all_feats + ["Horas (Real) [Y]"])

    X = valid[all_feats]
    y = valid["Horas (Real) [Y]"]

    model = build_model()
    kf    = KFold(n_splits=5, shuffle=True, random_state=42)

    cv_r2   = cross_val_score(model, X, y, cv=kf, scoring="r2")
    cv_mae  = -cross_val_score(model, X, y, cv=kf, scoring="neg_mean_absolute_error")
    cv_rmse = np.sqrt(-cross_val_score(model, X, y, cv=kf, scoring="neg_mean_squared_error"))

    metrics = {
        "r2_cv_mean":   round(float(cv_r2.mean()), 4),
        "r2_cv_std":    round(float(cv_r2.std()), 4),
        "mae_cv_mean":  round(float(cv_mae.mean()), 4),
        "rmse_cv_mean": round(float(cv_rmse.mean()), 4),
        "n_train":      int(len(valid)),
    }

    print(f"  CV R²:   {metrics['r2_cv_mean']:.3f} ± {metrics['r2_cv_std']:.3f}")
    print(f"  CV MAE:  {metrics['mae_cv_mean']:.3f} h")
    print(f"  CV RMSE: {metrics['rmse_cv_mean']:.3f} h")

    # Predicciones OUT-OF-FOLD: cada fila se predice con un modelo que NO la vio
    # durante su entrenamiento. Es la única forma honesta de mostrar el
    # rendimiento del modelo — las predicciones in-sample de un Random Forest
    # están infladas porque el algoritmo memoriza las filas que entrenó.
    oof = cross_val_predict(model, X, y, cv=kf, n_jobs=-1)
    df.loc[valid.index, "horas_pred"] = np.clip(oof, 0, None).round(2)

    return df, metrics


# ── Baseline: estimación humana vs modelo ─────────────────────────────────────

def compute_baseline(df: pd.DataFrame) -> dict:
    """
    Compara la estimación humana contra la predicción del modelo sobre la
    MISMA población y con la MISMA fórmula. Responde la pregunta de negocio:
    ¿el modelo estima mejor que los arquitectos del estudio?

    Reglas de la comparación honesta:
      · Predicción del modelo = out-of-fold (nunca vio esa fila al entrenar),
        igual que el humano, que estima antes de ejecutar la tarea.
      · Se excluye Buffer de Interrupción: nadie estima interrupciones.
      · Se excluyen filas con estimado o real en 0 (MAPE indefinido).
    """
    pop = df[
        (df["Puntos (Est)"] > 0)
        & (df["Horas (Real) [Y]"] > 0)
        & (df["categoria"] != "Buffer de Interrupción")
        & df["horas_pred"].notna()
    ]

    if pop.empty:
        return {}

    real  = pop["Horas (Real) [Y]"].to_numpy(dtype=float)
    est   = pop["Puntos (Est)"].to_numpy(dtype=float)
    pred  = pop["horas_pred"].to_numpy(dtype=float)

    err_humano = np.abs(real - est)
    err_modelo = np.abs(real - pred)

    humano_mae  = float(err_humano.mean())
    modelo_mae  = float(err_modelo.mean())
    humano_mape = float((err_humano / real).mean() * 100)
    modelo_mape = float((err_modelo / real).mean() * 100)

    # % de tareas en las que el modelo estuvo más cerca que la estimación humana
    win_rate = float((err_modelo < err_humano).mean() * 100)
    mejora_mae = ((humano_mae - modelo_mae) / humano_mae * 100) if humano_mae else 0.0

    baseline = {
        "n_tareas":     int(len(pop)),
        "humano_mae":   round(humano_mae, 3),
        "humano_mape":  round(humano_mape, 1),
        "modelo_mae":   round(modelo_mae, 3),
        "modelo_mape":  round(modelo_mape, 1),
        "mejora_mae":   round(mejora_mae, 1),
        "win_rate":     round(win_rate, 1),
        "modelo_gana":  bool(modelo_mae < humano_mae),
    }

    print(f"  Población comparable: {baseline['n_tareas']} tareas (sin Buffer)")
    print(f"  Estimación humana  → MAE {humano_mae:.3f} h · MAPE {humano_mape:.1f}%")
    print(f"  Modelo (out-of-fold) → MAE {modelo_mae:.3f} h · MAPE {modelo_mape:.1f}%")
    print(f"  Mejora sobre humano: {mejora_mae:+.1f}% · win rate {win_rate:.1f}%")

    return baseline


# ── Aggregations ──────────────────────────────────────────────────────────────

def _clean_val(v):
    """Convierte NaN/Inf → None y redondea floats. JSON no acepta NaN."""
    if isinstance(v, float):
        if np.isnan(v) or np.isinf(v):
            return None
        return round(v, 2)
    return v


def _round_records(df: pd.DataFrame) -> list[dict]:
    return [
        {k: _clean_val(v) for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


def agg_sprints(df: pd.DataFrame) -> list[dict]:
    # Preserve sprint order from data
    order = {s: i for i, s in enumerate(df["sprint"].dropna().unique())}

    g = (
        df.groupby("sprint", dropna=True)
        .agg(
            puntos_est=("Puntos (Est)",      "sum"),
            horas_real=("Horas (Real) [Y]",  "sum"),
            horas_pred=("horas_pred",         "sum"),
            n_tareas  =("ID_Registro (PK)",  "count"),
        )
        .reset_index()
    )
    g["diferencia"]       = (g["horas_real"] - g["puntos_est"]).round(2)
    g["tasa_calibracion"] = ((g["horas_real"] - g["puntos_est"]) / g["puntos_est"].replace(0, np.nan)).round(4)
    g["_ord"] = g["sprint"].map(order)
    g = g.sort_values("_ord").drop(columns=["_ord"])
    return _round_records(g)


def agg_personas(df: pd.DataFrame) -> list[dict]:
    g = (
        df.groupby("responsable", dropna=True)
        .agg(
            horas_real=("Horas (Real) [Y]", "sum"),
            puntos_est=("Puntos (Est)",      "sum"),
            n_tareas  =("ID_Registro (PK)", "count"),
        )
        .reset_index()
    )
    g["eficiencia"] = (g["puntos_est"] / g["horas_real"].replace(0, np.nan)).round(4)
    return _round_records(g.sort_values("horas_real", ascending=False))


def agg_proyectos(df: pd.DataFrame) -> list[dict]:
    g = (
        df.groupby(["proyecto", "tipo_proyecto"], dropna=True)
        .agg(
            horas_real=("Horas (Real) [Y]", "sum"),
            puntos_est=("Puntos (Est)",      "sum"),
            n_tareas  =("ID_Registro (PK)", "count"),
        )
        .reset_index()
    )
    return _round_records(g.sort_values("horas_real", ascending=False))


def agg_categorias(df: pd.DataFrame) -> list[dict]:
    g = (
        df.groupby("categoria", dropna=True)
        .agg(
            horas_real=("Horas (Real) [Y]", "sum"),
            puntos_est=("Puntos (Est)",      "sum"),
            n_tareas  =("ID_Registro (PK)", "count"),
        )
        .reset_index()
    )
    return _round_records(g.sort_values("horas_real", ascending=False))


def agg_herramientas(df: pd.DataFrame) -> list[dict]:
    g = (
        df[df["herramienta"] != "No aplica"]
        .groupby("herramienta", dropna=True)
        .agg(
            horas_real=("Horas (Real) [Y]", "sum"),
            n_tareas  =("ID_Registro (PK)", "count"),
        )
        .reset_index()
    )
    return _round_records(g.sort_values("horas_real", ascending=False))


# ── Serialise registros ───────────────────────────────────────────────────────

RECORD_COLS = [
    "ID_Registro (PK)", "sprint", "fecha", "dia", "proyecto", "tipo_proyecto",
    "responsable", "categoria", "herramienta",
    "nivel_incer", "nivel_incer_label", "nivel_comp", "nivel_comp_label",
    "Puntos (Est)", "Horas (Real) [Y]", "diferencia", "horas_pred",
    "tarea", "comentarios",
]

FIELD_RENAME = {
    "ID_Registro (PK)": "id_registro",
    "Puntos (Est)":     "puntos_est",
    "Horas (Real) [Y]": "horas_real",
}


# Columnas que SIEMPRE deben quedar como número en el JSON
NUMERIC_KEYS = {
    "id_registro", "nivel_incer", "nivel_comp",
    "puntos_est", "horas_real", "diferencia", "horas_pred",
}


def serialise_registros(df: pd.DataFrame) -> list[dict]:
    out = []
    cols = [c for c in RECORD_COLS if c in df.columns]
    for _, row in df[cols].iterrows():
        rec = {}
        for col in cols:
            key = FIELD_RENAME.get(col, col)
            val = row[col]
            if pd.isna(val):
                rec[key] = None
            elif isinstance(val, (bool, np.bool_)):
                rec[key] = bool(val)
            elif isinstance(val, (int, np.integer)):
                rec[key] = int(val)
            elif isinstance(val, (float, np.floating)):
                f = float(val)
                rec[key] = None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
            elif hasattr(val, "isoformat"):
                rec[key] = val.isoformat()[:10]
            elif key in NUMERIC_KEYS:
                # Forzar a número si la columna es numérica por contrato
                try:
                    f = float(val)
                    rec[key] = None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
                except (ValueError, TypeError):
                    rec[key] = None
            else:
                rec[key] = str(val)
        out.append(rec)
    return out


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("→ Auth Google Sheets...")
    gc = auth_sheets()
    sh = gc.open_by_key(SHEET_ID)

    print("→ Reading sheets...")
    sheets = load_sheets(sh)
    print(f"  Log_Registros: {len(sheets['log'])} rows")

    print("→ ETL...")
    df = run_etl(sheets)
    print(f"  Clean registros: {len(df)}")

    print("→ ML (Random Forest, 5-fold CV)...")
    df, model_metrics = train_and_predict(df)

    print("→ Baseline: estimación humana vs modelo...")
    baseline = compute_baseline(df)

    print("→ Building aggregations...")
    payload = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "n_registros":  int(len(df)),
            "n_sprints":    int(df["sprint"].nunique()),
            "model": {
                "type":        "RandomForestRegressor",
                "n_estimators": 300,
                "pred_mode":   "out_of_fold",
                **model_metrics,
            },
            "baseline": baseline,
        },
        "registros":    serialise_registros(df),
        "sprints":      agg_sprints(df),
        "personas":     agg_personas(df),
        "proyectos":    agg_proyectos(df),
        "categorias":   agg_categorias(df),
        "herramientas": agg_herramientas(df),
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    def _to_native(o):
        """Recursivamente convierte cualquier tipo numpy/pandas a tipo Python nativo."""
        if isinstance(o, dict):
            return {k: _to_native(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [_to_native(v) for v in o]
        if isinstance(o, (bool, np.bool_)):
            return bool(o)
        if isinstance(o, (int, np.integer)):
            return int(o)
        if isinstance(o, (float, np.floating)):
            f = float(o)
            return None if (np.isnan(f) or np.isinf(f)) else f
        if isinstance(o, np.ndarray):
            return _to_native(o.tolist())
        if hasattr(o, "isoformat"):
            return o.isoformat()
        return o

    payload = _to_native(payload)

    class _SafeEncoder(json.JSONEncoder):
        """Red de seguridad final — no debería disparar nunca tras _to_native."""
        def default(self, obj):
            if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
                return None
            try:
                return str(obj)
            except Exception:
                return None

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False, cls=_SafeEncoder)

    print(f"✓ Saved → {OUTPUT_PATH}  ({os.path.getsize(OUTPUT_PATH) // 1024} KB)")


if __name__ == "__main__":
    main()
