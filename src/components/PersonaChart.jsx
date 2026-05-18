// Avatares en círculo con la inicial del nombre
function Avatar({ name, color }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border border-bloom-line shrink-0"
      style={{ background: color + "33", color }}
    >
      {initial}
    </div>
  );
}

const COLORS = ["#5d8bb8", "#8a6db8", "#5a9760", "#d97757", "#b8902f", "#c46868", "#7a756f"];

export function PersonaChart({ personas }) {
  const data = (personas ?? [])
    .filter((p) => p.responsable && p.responsable !== "Sin asignar")
    .sort((a, b) => (Number(b.horas_real) || 0) - (Number(a.horas_real) || 0));

  const maxH = data.length ? Math.max(...data.map((p) => Number(p.horas_real) || 0)) : 1;
  const promedio = data.length ? data.reduce((s, p) => s + (Number(p.horas_real) || 0), 0) / data.length : 0;

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Equipo de trabajo</p>
        <h3 className="card-title mt-1">Carga de trabajo y desempeño del equipo</h3>
        <p className="card-sub mt-1">Horas reales registradas por cada miembro del estudio. El % indica desviación sobre el promedio del equipo.</p>
      </div>

      <div className="space-y-4">
        {data.map((p, i) => {
          const horas = Number(p.horas_real) || 0;
          const pct = (horas / maxH) * 100;
          const delta = promedio > 0 ? ((horas - promedio) / promedio) * 100 : 0;
          const color = COLORS[i % COLORS.length];

          return (
            <div key={p.responsable} className="flex items-center gap-4">
              <Avatar name={p.responsable} color={color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-sm font-medium text-bloom-ink">{p.responsable}</p>
                  <div className="flex items-baseline gap-3">
                    {Math.abs(delta) > 5 && (
                      <span className={`text-xs font-medium ${delta > 0 ? "text-bloom-orangedk" : "text-bloom-greendk"}`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(0)}% {delta > 0 ? "extra" : "menos"}
                      </span>
                    )}
                    <span className="font-serif text-base text-bloom-ink tabular-nums">{horas.toFixed(0)} h</span>
                  </div>
                </div>
                <div className="h-2 bg-bloom-line/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
