import { useMemo, useState } from "react";

// Etapas del proyecto (Ref_Fase en Google Sheets). El id es estable: el pipeline
// publica las horas por id y acá se decide orden, nombre legible y color.
export const ETAPAS = [
  { id: 1, corto: "Relevamiento",  largo: "Relevamiento y análisis previo",   color: "#a8c5e8" },
  { id: 2, corto: "Anteproyecto",  largo: "Anteproyecto y diseño",            color: "#c8b8e0" },
  { id: 3, corto: "Proyecto",      largo: "Proyecto y documentación técnica", color: "#a3c9a8" },
  { id: 4, corto: "Gestión muni.", largo: "Gestión municipal",                color: "#f0d795" },
  { id: 5, corto: "Obra",          largo: "Dirección técnica de obra",        color: "#f0b896" },
  { id: 6, corto: "Cómputo",       largo: "Cómputo, presupuesto y pliegos",   color: "#e8a8a8" },
];
const SIN_ETAPA = { id: 0, corto: "Sin etapa", largo: "Sin etapa asignada", color: "#d6d1c8" };

// Clases literales (Tailwind necesita verlas completas en el código).
const ESTADO_CLS = {
  "En pie":          "bg-bloom-green/20 text-bloom-greendk",
  "Por terminar":    "bg-bloom-blue/25 text-bloom-bluedk",
  "Espera contrato": "bg-bloom-violet/20 text-bloom-violetdk",
  "Pausado":         "bg-bloom-amber/25 text-bloom-amberdk",
  "Nuevo":           "bg-bloom-blue/25 text-bloom-bluedk",
  "Terminado":       "bg-bloom-line/60 text-bloom-mute",
  "Interno":         "bg-bloom-line/60 text-bloom-mute",
};
const ESTADO_ORDEN = ["En pie", "Por terminar", "Espera contrato", "Pausado", "Nuevo", "Terminado", "Interno"];

const METRICAS = [
  { id: "real",   label: "Horas reales" },
  { id: "est",    label: "Horas estimadas" },
  { id: "desvio", label: "Desvío vs. estimado" },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function cellValue(fase, metrica) {
  if (!fase) return null;
  const real = num(fase.horas_real);
  const est  = num(fase.puntos_est);
  if (metrica === "real") return real;
  if (metrica === "est")  return est;
  return est > 0 ? ((real - est) / est) * 100 : null;
}

function fmt(v, metrica) {
  if (v == null) return "·";
  if (metrica === "desvio") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}%`;
  return v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
}

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${ESTADO_CLS[estado] ?? "bg-bloom-line/60 text-bloom-mute"}`}>
      {estado ?? "Sin estado"}
    </span>
  );
}

// Barra apilada: cuánto se fue en cada etapa. El ancho total es relativo al
// proyecto más grande, así se ve también el tamaño relativo entre proyectos.
function BarraEtapas({ porEtapa, total, maxTotal }) {
  if (total <= 0) return null;
  return (
    <div className="h-1.5 rounded-full bg-bloom-line/40 overflow-hidden mt-1.5" style={{ width: `${Math.max((total / maxTotal) * 100, 4)}%` }}>
      <div className="flex h-full w-full">
        {porEtapa.map(({ etapa, horas }) =>
          horas > 0 ? (
            <div key={etapa.id} title={`${etapa.largo}: ${horas.toFixed(1)} h`}
                 style={{ width: `${(horas / total) * 100}%`, background: etapa.color }} />
          ) : null
        )}
      </div>
    </div>
  );
}

export function ProyectosFasesPanel({ proyectos, etapas, cobertura }) {
  const [estado, setEstado]   = useState("Todos");
  const [metrica, setMetrica] = useState("real");

  const filas = useMemo(
    () =>
      (proyectos ?? [])
        .filter((p) => p.proyecto && p.proyecto.trim().toLowerCase() !== "no aplica" && num(p.horas_real) > 0)
        .map((p) => ({ ...p, fases: p.fases ?? {} })),
    [proyectos]
  );

  const tieneEtapas = filas.some((p) => Object.keys(p.fases).length > 0);
  const hayHuerfanas = filas.some((p) => num(p.fases["0"]?.horas_real) > 0);
  const columnas = hayHuerfanas ? [...ETAPAS, SIN_ETAPA] : ETAPAS;

  const estadosPresentes = useMemo(() => {
    const cuenta = {};
    filas.forEach((p) => { const e = p.estado ?? "Sin estado"; cuenta[e] = (cuenta[e] ?? 0) + 1; });
    const orden = [...ESTADO_ORDEN, ...Object.keys(cuenta).filter((e) => !ESTADO_ORDEN.includes(e))];
    return orden.filter((e) => cuenta[e]).map((e) => [e, cuenta[e]]);
  }, [filas]);

  const visibles = filas
    .filter((p) => estado === "Todos" || (p.estado ?? "Sin estado") === estado)
    .sort((a, b) => num(b.horas_real) - num(a.horas_real));

  const maxTotal = Math.max(1, ...visibles.map((p) => num(p.horas_real)));

  // Máximo por celda: escala del mapa de calor (solo para real / estimadas).
  const maxCelda = Math.max(
    1,
    ...visibles.flatMap((p) => columnas.map((c) => Math.abs(cellValue(p.fases[String(c.id)], metrica) ?? 0)))
  );

  // Totales por columna (fila "Total" del pie) sobre lo que se está viendo.
  const totales = columnas.map((c) => {
    const real = visibles.reduce((s, p) => s + num(p.fases[String(c.id)]?.horas_real), 0);
    const est  = visibles.reduce((s, p) => s + num(p.fases[String(c.id)]?.puntos_est), 0);
    return metrica === "real" ? real : metrica === "est" ? est : est > 0 ? ((real - est) / est) * 100 : null;
  });
  const totalGeneral = visibles.reduce(
    (acc, p) => ({ real: acc.real + num(p.horas_real), est: acc.est + num(p.puntos_est) }),
    { real: 0, est: 0 }
  );

  // Resumen global por etapa (tira superior)
  const resumen = columnas
    .map((c) => {
      const e = (etapas ?? []).find((x) => num(x.etapa_id) === c.id);
      return { etapa: c, horas: num(e?.horas_real) };
    })
    .filter((r) => r.horas > 0);
  const horasResumen = resumen.reduce((s, r) => s + r.horas, 0);

  return (
    <div className="card space-y-6">
      <div>
        <p className="card-eyebrow">Cartera del estudio</p>
        <h3 className="card-title mt-1">Proyectos desglosados por etapa</h3>
        <p className="card-sub mt-1">
          Cuántas horas lleva cada proyecto en cada etapa, con su estado actual. La etapa se registra en cada tarea,
          así que el historial se conserva cuando un proyecto avanza.
        </p>
      </div>

      {!tieneEtapas ? (
        <p className="text-sm text-bloom-mute">
          Los datos publicados todavía no incluyen etapas. Usá “Actualizar Conocimiento” para regenerarlos.
        </p>
      ) : (
        <>
          {/* Tira global: en qué etapa se va el tiempo del estudio */}
          {horasResumen > 0 && (
            <div>
              <div className="flex h-3 rounded-full overflow-hidden bg-bloom-line/40">
                {resumen.map(({ etapa, horas }) => (
                  <div key={etapa.id} title={`${etapa.largo}: ${horas.toFixed(0)} h`}
                       style={{ width: `${(horas / horasResumen) * 100}%`, background: etapa.color }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                {resumen.map(({ etapa, horas }) => (
                  <span key={etapa.id} className="flex items-center gap-2 text-xs text-bloom-mute">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: etapa.color }} />
                    {etapa.largo}
                    <span className="text-bloom-ink font-medium tabular-nums">
                      {horas.toFixed(0)} h · {((horas / horasResumen) * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {[["Todos", filas.length], ...estadosPresentes].map(([e, n]) => (
                <button
                  key={e}
                  onClick={() => setEstado(e)}
                  aria-pressed={estado === e}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    estado === e
                      ? "bg-bloom-ink text-white border-bloom-ink"
                      : "bg-white text-bloom-mute border-bloom-line hover:border-bloom-bluedk hover:text-bloom-bluedk"
                  }`}
                >
                  {e} <span className="opacity-70 tabular-nums">{n}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-0.5 rounded-full border border-bloom-line bg-white" role="group" aria-label="Métrica">
              {METRICAS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetrica(m.id)}
                  aria-pressed={metrica === m.id}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    metrica === m.id ? "bg-bloom-line/70 text-bloom-ink font-medium" : "text-bloom-mute hover:text-bloom-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matriz proyecto × etapa */}
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[760px]">
              <thead>
                <tr className="text-[10px] font-medium uppercase tracking-[0.14em] text-bloom-mute">
                  <th className="text-left font-medium pb-2 pr-3 border-b border-bloom-line sticky left-0 bg-white">Proyecto</th>
                  {columnas.map((c) => (
                    <th key={c.id} className="text-right font-medium pb-2 px-2 border-b border-bloom-line whitespace-nowrap" title={c.largo}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: c.color }} />
                      {c.corto}
                    </th>
                  ))}
                  <th className="text-right font-medium pb-2 pl-3 border-b border-bloom-line">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const porEtapa = columnas.map((c) => ({ etapa: c, horas: num(p.fases[String(c.id)]?.horas_real) }));
                  const real = num(p.horas_real);
                  const est  = num(p.puntos_est);
                  const desvio = est > 0 ? ((real - est) / est) * 100 : null;
                  return (
                    <tr key={`${p.proyecto}-${p.tipo_proyecto}`} className="group">
                      <td className="py-2.5 pr-3 border-b border-bloom-line/60 sticky left-0 bg-white min-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium text-bloom-ink truncate">{p.proyecto}</p>
                          <EstadoBadge estado={p.estado} />
                        </div>
                        <p className="text-xs text-bloom-mute truncate">
                          {[p.cliente, p.tipo_proyecto].filter(Boolean).join(" · ")}
                        </p>
                        <BarraEtapas porEtapa={porEtapa} total={real} maxTotal={maxTotal} />
                      </td>
                      {columnas.map((c) => {
                        const v = cellValue(p.fases[String(c.id)], metrica);
                        const intensidad = v == null ? 0 : Math.min(Math.abs(v) / maxCelda, 1);
                        const desvioMalo = metrica === "desvio" && v != null && v > 0;
                        const fondo =
                          v == null || v === 0
                            ? "transparent"
                            : metrica === "desvio"
                              ? desvioMalo
                                ? `rgba(217,119,87,${0.08 + 0.4 * intensidad})`
                                : `rgba(90,151,96,${0.08 + 0.4 * intensidad})`
                              : `rgba(93,139,184,${0.07 + 0.45 * intensidad})`;
                        return (
                          <td key={c.id} className="py-2.5 px-2 text-right tabular-nums border-b border-bloom-line/60"
                              style={{ background: fondo }}>
                            <span className={v == null ? "text-bloom-line" : "text-bloom-ink"}>{fmt(v, metrica)}</span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-3 text-right tabular-nums border-b border-bloom-line/60 font-medium text-bloom-ink whitespace-nowrap">
                        {metrica === "desvio" ? fmt(desvio, "desvio") : fmt(metrica === "est" ? est : real, metrica)}
                        {metrica !== "desvio" && <span className="text-bloom-mute font-normal"> h</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="text-xs font-medium text-bloom-ink">
                  <td className="pt-3 pr-3 sticky left-0 bg-white">Total ({visibles.length} proyectos)</td>
                  {totales.map((t, i) => (
                    <td key={columnas[i].id} className="pt-3 px-2 text-right tabular-nums">{fmt(t === 0 && metrica !== "desvio" ? null : t, metrica)}</td>
                  ))}
                  <td className="pt-3 pl-3 text-right tabular-nums whitespace-nowrap">
                    {metrica === "desvio"
                      ? fmt(totalGeneral.est > 0 ? ((totalGeneral.real - totalGeneral.est) / totalGeneral.est) * 100 : null, "desvio")
                      : `${fmt(metrica === "est" ? totalGeneral.est : totalGeneral.real, metrica)} h`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-bloom-mute leading-relaxed">
            {metrica === "desvio"
              ? "Desvío = (real − estimado) / estimado. En naranja, etapas que llevaron más de lo presupuestado; en verde, menos."
              : "Cuanto más oscuro el celeste, más horas. La barra bajo cada nombre muestra cómo se reparte el proyecto entre etapas."}
            {cobertura?.pct_horas_con_etapa != null && (
              <> {cobertura.pct_horas_con_etapa.toFixed(0)}% de las horas registradas tiene etapa asignada.</>
            )}
          </p>
        </>
      )}
    </div>
  );
}
