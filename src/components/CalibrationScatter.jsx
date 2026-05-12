import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CAT_COLORS = {
  "Modelado":               "#38bdf8",
  "Documentación":          "#a78bfa",
  "Buffer de Interrupción": "#6b7280",
  "Obra":                   "#f97316",
  "Investigación":          "#34d399",
  "Gestión":                "#fbbf24",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  if (!d?.categoria) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl max-w-[200px]">
      <p className="font-semibold text-white truncate">{d.tarea ?? "—"}</p>
      <p className="text-gray-400 mt-0.5">{d.categoria}</p>
      <p className="mt-1">Est: <span className="text-sky-400 font-bold">{d.puntos_est} pts</span></p>
      <p>Real: <span className="text-orange-400 font-bold">{d.horas_real} h</span></p>
    </div>
  );
};

export function CalibrationScatter({ registros }) {
  const data = (registros ?? []).filter(
    (r) => r.puntos_est != null && r.horas_real != null && r.categoria !== "Buffer de Interrupción"
  );

  const rawMax = data.length
    ? Math.max(...data.map((r) => Math.max(r.puntos_est ?? 0, r.horas_real ?? 0)))
    : 8;
  const max = Math.ceil(Math.max(rawMax, 8));

  // Diagonal perfecta y = x
  const diagLine = [{ x: 0, y: 0 }, { x: max, y: max }];

  return (
    <div className="card">
      <p className="card-title">Calibración — Estimado vs Real</p>
      <p className="text-xs text-gray-500 mb-3">
        Puntos sobre la diagonal = se tardó más de lo estimado
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart margin={{ top: 8, right: 8, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            type="number" dataKey="x" name="Estimado"
            domain={[0, max]} tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false} tickLine={false}
            label={{ value: "Puntos Est.", position: "insideBottom", offset: -10, fill: "#4b5563", fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y" name="Real"
            domain={[0, max]} tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false} tickLine={false}
            label={{ value: "Horas Real", angle: -90, position: "insideLeft", fill: "#4b5563", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Línea diagonal perfecta */}
          <Line
            data={diagLine} dataKey="y" dot={false} activeDot={false}
            stroke="#374151" strokeDasharray="5 5" strokeWidth={1.5}
            legendType="none"
          />
          {/* Scatter de registros */}
          <Scatter
            data={data.map((r) => ({ ...r, x: r.puntos_est, y: r.horas_real }))}
            opacity={0.75}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={CAT_COLORS[entry.categoria] ?? "#64748b"} />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {Object.entries(CAT_COLORS)
          .filter(([k]) => k !== "Buffer de Interrupción")
          .map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: v }} />
              {k}
            </span>
          ))}
      </div>
    </div>
  );
}
