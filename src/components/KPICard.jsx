export function KPICard({ icon: Icon, title, value, sub, trend, color = "sky" }) {
  const colors = {
    sky:    "text-sky-400 bg-sky-400/10",
    green:  "text-green-400 bg-green-400/10",
    amber:  "text-amber-400 bg-amber-400/10",
    rose:   "text-rose-400 bg-rose-400/10",
    violet: "text-violet-400 bg-violet-400/10",
  };

  return (
    <div className="card flex gap-4 items-start">
      <div className={`p-2.5 rounded-lg shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="card-title">{title}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? "text-rose-400" : "text-green-400"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)} h sobre estimado
          </p>
        )}
      </div>
    </div>
  );
}
