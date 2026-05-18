import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLOR_OK    = "#5a9760";  // verde sage — en tiempo
const COLOR_LATE  = "#d97757";  // naranja arcilla — con retraso

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  if (!d?.categoria) return null;
  const retraso = (d.horas_real ?? 0) - (d.puntos_est ?? 0);
  return (
    <div className="bg-white border border-bloom-line rounded-lg p-3 text-xs shadow-md font-sans max-w-[220px]">
      <p className="font-medium text-bloom-ink truncate">{d.tarea ?? "Tarea sin detalle"}</p>
      <p className="text-bloom-mute mt-0.5">{d.categoria} · {d.sprint ?? "—"}</p>
      <p className="mt-1">Estimado: <span className="text-bloom-bluedk font-semibold">{d.puntos_est} pts</span></p>
      <p>Real: <span className="text-bloom-orangedk font-semibold">{d.horas_real} h</span></p>
      <p className={`mt-1 font-medium ${retraso > 0 ? "text-bloom-rosedk" : "text-bloom-greendk"}`}>
        {retraso > 0 ? `Tardó ${retraso.toFixed(1)} h más de lo planeado` : `${Math.abs(retraso).toFixed(1)} h dentro del plan`}
      </p>
    </div>
  );
};

export function CalibrationScatter({ registros }) {
  const data = (registros ?? []).filter(
    (r) => r.puntos_est != null && r.horas_real != null && r.categoria !== "Buffer de Interrupción"
  );

  const rawMax = data.length
    ? Math.max(...data.map((r) => Math.max(Number(r.puntos_est) || 0, Number(r.horas_real) || 0)))
    : 8;
  const max = Math.ceil(Math.max(rawMax, 8));

  const diagLine = [{ x: 0, y: 0 }, { x: max, y: max }];

  const enriched = data.map((r) => ({
    ...r,
    x: r.puntos_est,
    y: r.horas_real,
    late: (Number(r.horas_real) || 0) > (Number(r.puntos_est) || 0),
  }));

  const nOk   = enriched.filter((r) => !r.late).length;
  const nLate = enriched.filter((r) => r.late).length;

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Diagnóstico de planificación</p>
        <h3 className="card-title mt-1">Mapa de imprevistos por tarea</h3>
        <p className="card-sub mt-1">Cada punto es una tarea del estudio. Posición = estimado vs real. Color = si fue dentro del plan o con retraso.</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: -8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e8e4dd" />
          <XAxis
            type="number" dataKey="x" domain={[0, max]}
            tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false}
            label={{ value: "Horas estimadas", position: "insideBottom", offset: -12, fill: "#7a756f", fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y" domain={[0, max]}
            tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false}
            label={{ value: "Horas reales", angle: -90, position: "insideLeft", fill: "#7a756f", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            data={diagLine} dataKey="y" dot={false} activeDot={false}
            stroke="#c8c2b8" strokeDasharray="4 4" strokeWidth={1}
            legendType="none"
          />
          <Scatter data={enriched} opacity={0.78}>
            {enriched.map((r, i) => (
              <Cell key={i} fill={r.late ? COLOR_LATE : COLOR_OK} />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-2 text-xs text-bloom-mute">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_OK }} />
          En tiempo · <span className="text-bloom-ink font-medium">{nOk}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-bloom-mute">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_LATE }} />
          Con retraso · <span className="text-bloom-ink font-medium">{nLate}</span>
        </span>
      </div>
    </div>
  );
}
