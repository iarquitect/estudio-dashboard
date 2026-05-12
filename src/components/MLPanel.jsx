import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

function MetricBadge({ label, value, unit = "" }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-white">{value}<span className="text-sm text-gray-400 ml-0.5">{unit}</span></p>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white truncate max-w-[160px]">{d.tarea ?? "—"}</p>
      <p className="text-gray-400">{d.responsable} · {d.sprint}</p>
      <p className="mt-1">Real: <span className="text-orange-400 font-bold">{d.horas_real} h</span></p>
      <p>Pred: <span className="text-sky-400 font-bold">{d.horas_pred} h</span></p>
      <p className={`font-medium mt-0.5 ${Math.abs(d.horas_real - d.horas_pred) > 1 ? "text-rose-400" : "text-green-400"}`}>
        Δ {(d.horas_real - d.horas_pred).toFixed(2)} h
      </p>
    </div>
  );
};

export function MLPanel({ registros, model }) {
  const scatter = registros
    .filter((r) => r.horas_real != null && r.horas_pred != null)
    .map((r) => ({ ...r }));

  const max = Math.ceil(Math.max(...scatter.map((r) => Math.max(r.horas_real, r.horas_pred)), 8));

  const mae = scatter.length
    ? (scatter.reduce((s, r) => s + Math.abs(r.horas_real - r.horas_pred), 0) / scatter.length).toFixed(2)
    : "—";

  return (
    <div className="card space-y-4">
      <div>
        <p className="card-title">Modelo ML — Random Forest</p>
        <p className="text-xs text-gray-500">
          Entrenado con {model.n_train} registros · {model.n_estimators} árboles · 5-Fold CV
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricBadge label="R² CV"   value={model.r2_cv_mean}  unit={` ±${model.r2_cv_std}`} />
        <MetricBadge label="MAE CV"  value={model.mae_cv_mean}  unit=" h" />
        <MetricBadge label="RMSE CV" value={model.rmse_cv_mean} unit=" h" />
        <MetricBadge label="MAE muestra" value={mae} unit=" h" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Real vs Predicho — puntos sobre la diagonal = subestimó el modelo</p>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              type="number" dataKey="horas_real" name="Real"
              domain={[0, max]} tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false} tickLine={false}
              label={{ value: "Horas Real", position: "insideBottom", offset: -2, fill: "#4b5563", fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="horas_pred" name="Predicho"
              domain={[0, max]} tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false} tickLine={false}
              label={{ value: "Horas Pred.", angle: -90, position: "insideLeft", fill: "#4b5563", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke="#374151" strokeDasharray="4 4" />
            <Scatter data={scatter} opacity={0.7}>
              {scatter.map((r, i) => {
                const err = Math.abs(r.horas_real - r.horas_pred);
                const fill = err <= 0.5 ? "#34d399" : err <= 1.5 ? "#fbbf24" : "#f43f5e";
                return <Cell key={i} fill={fill} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          {[["≤ 0.5 h", "#34d399"], ["≤ 1.5 h", "#fbbf24"], ["> 1.5 h", "#f43f5e"]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
