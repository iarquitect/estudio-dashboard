import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, Target, AlertCircle, Gauge } from "lucide-react";

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

export function MLPanel({ registros, model }) {
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
  const mape = tareasParaMape.length
    ? (tareasParaMape.reduce((s, r) => {
        const real = Number(r.horas_real) || 0;
        const pred = Number(r.horas_pred) || 0;
        return s + Math.abs((real - pred) / real);
      }, 0) / tareasParaMape.length) * 100
    : 0;

  const m = model ?? {};

  return (
    <div className="card space-y-6">
      <div>
        <p className="card-eyebrow">Aprendizaje del estudio</p>
        <h3 className="card-title mt-1">Motor predictivo de inteligencia artificial</h3>
        <p className="card-sub mt-1">
          Un modelo de Random Forest aprende de las {m.n_train ?? 0} tareas registradas para predecir cuántas horas
          insumirá cada nueva. Más datos = mejor calibración del estudio.
        </p>
      </div>

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
          value={mape.toFixed(1)}
          unit="%"
          helper={`Error porcentual absoluto promedio sobre ${tareasParaMape.length} tareas. Una métrica relativa: indica cuánto se desvía la predicción respecto al valor real, en %.`}
          accent={mape > 60 ? "rose" : mape > 35 ? "amber" : "green"}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-bloom-ink mb-1">Precisión por tarea: lo planeado vs. la realidad</p>
        <p className="text-xs text-bloom-mute mb-3">
          Los puntos que se escapan hacia arriba de la línea son tareas que sufrieron imprevistos y tomaron más tiempo del presupuestado.
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
