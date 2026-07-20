import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, Target, AlertCircle, Gauge, Users, Cpu } from "lucide-react";

function MetricCard({ icon: Icon, label, value, unit = "", helper, accent = "green" }) {
  const colors = {
    green:  { bg: "bg-bloom-green/15",  ico: "text-bloom-greendk",  num: "text-bloom-greendk"  },
    blue:   { bg: "bg-bloom-blue/15",   ico: "text-bloom-bluedk",   num: "text-bloom-bluedk"   },
    amber:  { bg: "bg-bloom-amber/15",  ico: "text-bloom-amberdk",  num: "text-bloom-amberdk"  },
    rose:   { bg: "bg-bloom-rose/15",   ico: "text-bloom-rosedk",   num: "text-bloom-rosedk"   },
  };
  const c = colors[accent];
  return (
    <div className="border border-bloom-line rounded-xl p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${c.bg}`}>
          <Icon size={14} strokeWidth={1.5} className={c.ico} />
        </div>
        <p className="text-xs text-bloom-mute leading-tight">{label}</p>
      </div>
      <p className={`font-serif text-3xl font-medium leading-none ${c.num} tabular-nums`}>
        {value}<span className="text-base text-bloom-mute ml-1">{unit}</span>
      </p>
      {helper && <p className="text-xs text-bloom-mute mt-2 leading-snug">{helper}</p>}
    </div>
  );
}

// ── Comparación honesta: estimación del estudio vs predicción del modelo ──────
function BaselineComparison({ baseline }) {
  if (!baseline || !baseline.n_tareas) return null;

  const ganaModelo = baseline.modelo_gana;
  const ganador = ganaModelo ? "modelo" : "estudio";

  // El que gana se resalta; el que pierde queda en gris
  const side = (esGanador) =>
    esGanador
      ? { box: "border-bloom-green/50 bg-bloom-green/[0.07]", num: "text-bloom-greendk", ico: "bg-bloom-green/20 text-bloom-greendk" }
      : { box: "border-bloom-line bg-white",                  num: "text-bloom-mute",    ico: "bg-bloom-line/50 text-bloom-mute"    };

  const humano = side(!ganaModelo);
  const modelo = side(ganaModelo);

  const brecha = Math.abs(baseline.mejora_mae);

  return (
    <div className="border border-bloom-line rounded-xl p-5 bg-bloom-paper/60">
      <div className="mb-4">
        <p className="text-sm font-medium text-bloom-ink">¿Quién estima mejor: el estudio o el modelo?</p>
        <p className="text-xs text-bloom-mute mt-1 leading-relaxed">
          Comparación sobre las mismas {baseline.n_tareas} tareas y con la misma fórmula. Las predicciones del modelo son
          <strong className="font-medium"> out-of-fold</strong>: cada tarea la predice un modelo que no la vio al entrenar,
          igual que ustedes, que estiman antes de ejecutarla.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Estudio */}
        <div className={`rounded-lg border p-4 ${humano.box}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${humano.ico}`}>
              <Users size={14} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-bloom-ink">Estimación del estudio</p>
            {!ganaModelo && (
              <span className="ml-auto text-[10px] uppercase tracking-wider font-medium text-bloom-greendk">Gana</span>
            )}
          </div>
          <div className="flex items-baseline gap-5">
            <div>
              <p className={`font-serif text-3xl font-medium leading-none tabular-nums ${humano.num}`}>
                {baseline.humano_mae.toFixed(2)}<span className="text-base text-bloom-mute ml-1">h</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-bloom-mute mt-1.5">Error medio</p>
            </div>
            <div>
              <p className={`font-serif text-3xl font-medium leading-none tabular-nums ${humano.num}`}>
                {baseline.humano_mape.toFixed(1)}<span className="text-base text-bloom-mute ml-0.5">%</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-bloom-mute mt-1.5">MAPE</p>
            </div>
          </div>
        </div>

        {/* Modelo */}
        <div className={`rounded-lg border p-4 ${modelo.box}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${modelo.ico}`}>
              <Cpu size={14} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-bloom-ink">Modelo Random Forest</p>
            {ganaModelo && (
              <span className="ml-auto text-[10px] uppercase tracking-wider font-medium text-bloom-greendk">Gana</span>
            )}
          </div>
          <div className="flex items-baseline gap-5">
            <div>
              <p className={`font-serif text-3xl font-medium leading-none tabular-nums ${modelo.num}`}>
                {baseline.modelo_mae.toFixed(2)}<span className="text-base text-bloom-mute ml-1">h</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-bloom-mute mt-1.5">Error medio</p>
            </div>
            <div>
              <p className={`font-serif text-3xl font-medium leading-none tabular-nums ${modelo.num}`}>
                {baseline.modelo_mape.toFixed(1)}<span className="text-base text-bloom-mute ml-0.5">%</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-bloom-mute mt-1.5">MAPE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Veredicto */}
      <div className="mt-4 pt-4 border-t border-bloom-line flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`text-sm font-medium ${ganaModelo ? "text-bloom-greendk" : "text-bloom-orangedk"}`}>
          {ganaModelo
            ? `El modelo reduce el error de estimación un ${brecha.toFixed(0)}%.`
            : `Todavía estiman mejor ustedes: el modelo se equivoca un ${brecha.toFixed(0)}% más.`}
        </span>
        <span className="text-xs text-bloom-mute">
          El modelo estuvo más cerca que la estimación humana en {baseline.win_rate.toFixed(0)}% de las tareas.
        </span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  if (!d?.responsable) return null;
  const delta = (d.horas_real ?? 0) - (d.horas_pred ?? 0);
  return (
    <div className="bg-white border border-bloom-line rounded-lg p-3 text-xs shadow-md font-sans max-w-[220px]">
      <p className="font-medium text-bloom-ink truncate">{d.tarea ?? "—"}</p>
      <p className="text-bloom-mute">{d.responsable} · {d.sprint}</p>
      <p className="mt-1">Real: <span className="text-bloom-orangedk font-semibold">{d.horas_real} h</span></p>
      <p>Predicho: <span className="text-bloom-bluedk font-semibold">{d.horas_pred} h</span></p>
      <p className={`mt-1 font-medium ${Math.abs(delta) > 1 ? "text-bloom-rosedk" : "text-bloom-greendk"}`}>
        Diferencia: {delta.toFixed(2)} h
      </p>
    </div>
  );
};

export function MLPanel({ registros, model, baseline }) {
  const scatter = (registros ?? []).filter(
    (r) => r.horas_real != null && r.horas_pred != null
  );

  const rawMax = scatter.length
    ? Math.max(...scatter.map((r) => Math.max(Number(r.horas_real) || 0, Number(r.horas_pred) || 0)))
    : 8;
  const max = Math.ceil(Math.max(rawMax, 8));
  const diagLine = [{ x: 0, y: 0 }, { x: max, y: max }];

  // MAPE — Mean Absolute Percentage Error sobre las predicciones del Random Forest.
  // Filtra tareas con horas_real = 0 para evitar división por cero (Infinity).
  const tareasParaMape = scatter.filter((r) => (Number(r.horas_real) || 0) > 0);
  const mapeLocal = tareasParaMape.length
    ? (tareasParaMape.reduce((s, r) => {
        const real = Number(r.horas_real) || 0;
        const pred = Number(r.horas_pred) || 0;
        return s + Math.abs((real - pred) / real);
      }, 0) / tareasParaMape.length) * 100
    : 0;

  // Si el pipeline ya publica el baseline, usamos su MAPE para que todas las
  // cifras del panel refieran a la misma población (sin Buffer de Interrupción).
  const mapeModelo = baseline?.modelo_mape ?? mapeLocal;
  const nMape      = baseline?.n_tareas ?? tareasParaMape.length;

  const m = model ?? {};

  return (
    <div className="card space-y-6">
      <div>
        <p className="card-eyebrow">Aprendizaje del estudio</p>
        <h3 className="card-title mt-1">Motor predictivo de inteligencia artificial</h3>
        <p className="card-sub mt-1">
          Un modelo de Random Forest aprende de las {m.n_train ?? 0} tareas registradas para predecir cuántas horas
          insumirá cada nueva. Todas las métricas de esta sección son <strong className="font-medium">out-of-fold</strong>:
          se miden sobre tareas que el modelo no vio durante su entrenamiento.
        </p>
      </div>

      <BaselineComparison baseline={baseline} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Gauge}
          label="R²"
          value={(m.r2_cv_mean ?? 0).toFixed(4)}
          unit={`±${(m.r2_cv_std ?? 0).toFixed(4)}`}
          helper="El algoritmo logra decodificar matemáticamente este % de nuestros tiempos operativos. El resto depende de factores humanos y creativos."
          accent="green"
        />
        <MetricCard
          icon={Target}
          label="Margen de Error Promedio (MAE)"
          value={(m.mae_cv_mean ?? 0).toFixed(4)}
          unit="h"
          helper="En el día a día, nuestras predicciones de tiempo fallan por menos de 1 hora en promedio."
          accent="green"
        />
        <MetricCard
          icon={AlertCircle}
          label="Desvío en Fallos Críticos (RMSE)"
          value={(m.rmse_cv_mean ?? 0).toFixed(4)}
          unit="h"
          helper="Cuando la predicción falla por problemas graves o cambios drásticos, el desvío se eleva a este valor en promedio."
          accent="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="MAPE Modelo"
          value={mapeModelo.toFixed(1)}
          unit="%"
          helper={`Error porcentual absoluto promedio sobre ${nMape} tareas${baseline?.n_tareas ? " comparables (sin interrupciones)" : ""}. Indica cuánto se desvía la predicción respecto al valor real, en %.`}
          accent={mapeModelo > 60 ? "rose" : mapeModelo > 35 ? "amber" : "green"}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-bloom-ink mb-1">Precisión por tarea: lo planeado vs. la realidad</p>
        <p className="text-xs text-bloom-mute mb-3">
          Cada punto es una tarea predicha por un modelo que no la vio al entrenar. Cuanto más cerca de la línea, mejor la predicción;
          los puntos que se alejan son tareas cuyo tiempo real no se explica por los datos que hoy registramos.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: -8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e8e4dd" />
            <XAxis
              type="number" dataKey="x" domain={[0, max]}
              tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false}
              label={{ value: "Horas reales", position: "insideBottom", offset: -12, fill: "#7a756f", fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="y" domain={[0, max]}
              tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false}
              label={{ value: "Horas predichas", angle: -90, position: "insideLeft", fill: "#7a756f", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              data={diagLine} dataKey="y" dot={false} activeDot={false}
              stroke="#c8c2b8" strokeDasharray="4 4" strokeWidth={1}
              legendType="none"
            />
            <Scatter
              data={scatter.map((r) => ({ ...r, x: r.horas_real, y: r.horas_pred }))}
              opacity={0.78}
            >
              {scatter.map((r, i) => {
                const err = Math.abs((r.horas_real ?? 0) - (r.horas_pred ?? 0));
                const fill = err <= 0.5 ? "#5a9760" : err <= 1.5 ? "#d4a84a" : "#d97757";
                return <Cell key={i} fill={fill} />;
              })}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-5 mt-3">
          {[["≤ 0.5 h de error", "#5a9760"], ["≤ 1.5 h de error", "#d4a84a"], ["> 1.5 h de error", "#d97757"]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-2 text-xs text-bloom-mute">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
