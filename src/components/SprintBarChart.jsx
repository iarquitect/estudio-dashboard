import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value.toFixed(1)} h</span>
        </p>
      ))}
      {payload.length === 2 && (
        <p className={`mt-1 font-medium ${payload[1].value - payload[0].value > 0 ? "text-rose-400" : "text-green-400"}`}>
          Δ {(payload[1].value - payload[0].value).toFixed(1)} h
        </p>
      )}
    </div>
  );
};

export function SprintBarChart({ sprints }) {
  // Abbreviate sprint label for X axis
  const data = sprints.map((s) => ({
    ...s,
    label: s.sprint.replace("Sprint ", "S"),
  }));

  return (
    <div className="card">
      <p className="card-title">Estimado vs Real por Sprint</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} unit=" h" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#9ca3af", paddingTop: 8 }}
            formatter={(v) => v}
          />
          <Bar dataKey="puntos_est" name="Puntos Est." fill="#38bdf8" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar dataKey="horas_real" name="Horas Real"  fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
