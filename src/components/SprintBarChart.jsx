import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-bloom-line rounded-lg p-3 text-xs shadow-md font-sans">
      <p className="font-medium text-bloom-ink mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{Number(p.value ?? 0).toFixed(1)} h</span>
        </p>
      ))}
      {payload.length === 2 && (
        <p className={`mt-1 font-medium ${payload[1].value - payload[0].value > 0 ? "text-bloom-rosedk" : "text-bloom-greendk"}`}>
          Δ {(payload[1].value - payload[0].value).toFixed(1)} h
        </p>
      )}
    </div>
  );
};

export function SprintBarChart({ sprints }) {
  const data = (sprints ?? []).map((s) => ({
    ...s,
    label: (s.sprint ?? "").replace("Sprint ", "S"),
  }));

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Calibración temporal</p>
        <h3 className="card-title mt-1">Lo que calculamos vs. lo que realmente tomó</h3>
        <p className="card-sub mt-1">Comparación sprint a sprint entre las horas presupuestadas y las efectivamente invertidas.</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e8e4dd" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#7a756f", fontSize: 11 }} axisLine={false} tickLine={false} unit=" h" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f5f2ec" }} />
          <Legend
            iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#7a756f", paddingTop: 12 }}
          />
          <Bar dataKey="puntos_est" name="Estimado (h)" fill="#a8c5e8" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="horas_real" name="Real (h)"     fill="#f0b896" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
