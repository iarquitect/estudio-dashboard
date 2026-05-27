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

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Equipo de trabajo</p>
        <h3 className="card-title mt-1">Carga de trabajo y desempeño del equipo</h3>
        <p className="card-sub mt-1">
          Horas reales registradas por cada miembro. El % indica cuánto se desvió cada uno respecto a sus propias horas estimadas.
        </p>
      </div>

      <div className="space-y-4">
        {data.map((p, i) => {
          const horas = Number(p.horas_real) || 0;
          const est   = Number(p.puntos_est) || 0;
          const widthPct = (horas / maxH) * 100;

          // Desviación individual: (Real − Estimado) / Estimado
          // 0  → "0%"   (planificó exacto)
          // 0.18 → "+18%" (tardó 18% más de lo planeado)
          // -0.05 → "−5%" (terminó antes)
          const deltaFrac = est > 0 ? (horas - est) / est : 0;
          const deltaInt  = Math.round(deltaFrac * 100);

          const deltaLabel =
            deltaInt === 0 ? "0%"
            : deltaInt > 0  ? `+${deltaInt}%`
            :                 `−${Math.abs(deltaInt)}%`;

          const deltaColor =
            Math.abs(deltaInt) < 1 ? "text-bloom-mute"
            : deltaInt > 0          ? "text-bloom-orangedk"
            :                          "text-bloom-greendk";

          const color = COLORS[i % COLORS.length];

          return (
            <div key={p.responsable} className="flex items-center gap-4">
              <Avatar name={p.responsable} color={color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-sm font-medium text-bloom-ink">{p.responsable}</p>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-xs font-medium ${deltaColor}`}
                      title={est > 0 ? `Estimado: ${est.toFixed(0)} h · Real: ${horas.toFixed(0)} h` : "Sin estimación previa"}
                    >
                      {est > 0 ? deltaLabel : "—"}
                    </span>
                    <span className="font-serif text-base text-bloom-ink tabular-nums">{horas.toFixed(0)} h</span>
                  </div>
                </div>
                <div className="h-2 bg-bloom-line/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${widthPct}%`, background: color, opacity: 0.7 }}
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
