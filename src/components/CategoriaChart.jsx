import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#38bdf8", "#a78bfa", "#6b7280", "#f97316", "#34d399", "#fbbf24"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white">{d.categoria}</p>
      <p className="text-gray-400">{d.n_tareas} tareas</p>
      <p>{d.horas_real.toFixed(1)} h reales</p>
    </div>
  );
};

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + r * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CategoriaChart({ categorias }) {
  return (
    <div className="card">
      <p className="card-title">Distribución por Categoría</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={categorias}
            dataKey="horas_real"
            nameKey="categoria"
            cx="50%"
            cy="50%"
            outerRadius={95}
            labelLine={false}
            label={renderLabel}
          >
            {categorias.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => <span className="text-xs text-gray-400">{v}</span>}
            wrapperStyle={{ paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
