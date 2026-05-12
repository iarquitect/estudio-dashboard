import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#f97316", "#fbbf24", "#f43f5e", "#64748b"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className="text-gray-400">{d.n_tareas} tareas</p>
      <p>Horas reales: <span className="font-bold text-orange-400">{d.horas_real.toFixed(1)} h</span></p>
      <p>Eficiencia: <span className="font-bold text-sky-400">{(d.eficiencia ?? 0).toFixed(2)}x</span></p>
    </div>
  );
};

export function PersonaChart({ personas }) {
  const data = [...personas].filter((p) => p.responsable !== "Sin asignar");

  return (
    <div className="card">
      <p className="card-title">Horas Reales por Responsable</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} unit=" h" />
          <YAxis type="category" dataKey="responsable" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="horas_real" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
