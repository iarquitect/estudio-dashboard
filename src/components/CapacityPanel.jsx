import { Shield, Layers3, TrendingUp } from "lucide-react";

function Bloque({ icon: Icon, eyebrow, children }) {
  return (
    <div className="border border-bloom-line rounded-xl p-5 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-bloom-violet/20 flex items-center justify-center">
          <Icon size={14} strokeWidth={1.5} className="text-bloom-violetdk" />
        </div>
        <p className="card-eyebrow">{eyebrow}</p>
      </div>
      {children}
    </div>
  );
}

export function CapacityPanel({ capacity }) {
  if (!capacity || (!capacity.buffer && !capacity.agregacion && !capacity.riesgo)) return null;

  const { buffer, agregacion, riesgo } = capacity;

  return (
    <div className="card space-y-5">
      <div>
        <p className="card-eyebrow">Planificación de capacidad</p>
        <h3 className="card-title mt-1">Cómo comprometer plazos con los datos del estudio</h3>
        <p className="card-sub mt-1">
          Tres cosas que la predicción tarea por tarea no puede darte: cuánto reservar para imprevistos,
          a qué nivel planificar, y cuánto margen agregar para comprometerse con seguridad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1 — Buffer */}
        {buffer && (
          <Bloque icon={Shield} eyebrow="Reserva para imprevistos">
            <p className="font-serif text-4xl font-medium text-bloom-ink leading-none tabular-nums">
              {buffer.share_p80.toFixed(0)}<span className="text-xl text-bloom-mute">%</span>
            </p>
            <p className="text-xs text-bloom-mute mt-2 leading-relaxed">
              Reservando este porcentaje del sprint para interrupciones, cubrís 8 de cada 10 semanas.
              El promedio histórico es {buffer.share_medio.toFixed(0)}%, pero oscila entre {buffer.share_min.toFixed(0)}% y {buffer.share_max.toFixed(0)}%.
            </p>
            <p className="text-xs text-bloom-mute mt-2 pt-2 border-t border-bloom-line">
              Son <strong className="font-medium text-bloom-ink">{buffer.horas_total.toFixed(0)} h</strong> en {buffer.n_sprints} sprints
              que nadie estimó de antemano.
            </p>
          </Bloque>
        )}

        {/* 2 — Nivel de agregación */}
        {agregacion && (
          <Bloque icon={Layers3} eyebrow="A qué nivel planificar">
            <div className="flex items-baseline gap-3">
              <p className="font-serif text-4xl font-medium text-bloom-greendk leading-none tabular-nums">
                {agregacion.error_sprint.toFixed(0)}<span className="text-xl text-bloom-mute">%</span>
              </p>
              <p className="text-sm text-bloom-mute">
                vs <span className="font-serif text-xl text-bloom-mute">{agregacion.error_tarea.toFixed(0)}%</span>
              </p>
            </div>
            <p className="text-xs text-bloom-mute mt-2 leading-relaxed">
              Error al estimar <strong className="font-medium text-bloom-ink">el total de un sprint</strong> contra
              el error al estimar <strong className="font-medium">una tarea suelta</strong>.
            </p>
            <p className="text-xs text-bloom-mute mt-2 pt-2 border-t border-bloom-line">
              Al sumar tareas los errores se compensan. Comprometé plazos por sprint, no tarea por tarea.
            </p>
          </Bloque>
        )}

        {/* 3 — Multiplicador de riesgo */}
        {riesgo && (
          <Bloque icon={TrendingUp} eyebrow="Margen para comprometerse">
            <p className="font-serif text-4xl font-medium text-bloom-ink leading-none tabular-nums">
              {riesgo.p80.toFixed(2)}<span className="text-xl text-bloom-mute">×</span>
            </p>
            <p className="text-xs text-bloom-mute mt-2 leading-relaxed">
              Multiplicando la estimación por este factor, cumplís el plazo en 8 de cada 10 tareas.
              La mitad de las tareas se resuelven en {riesgo.p50.toFixed(2)}× lo estimado; el 5% más difícil supera {riesgo.p95.toFixed(1)}×.
            </p>
            {riesgo.por_incertidumbre?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-bloom-line space-y-1">
                {riesgo.por_incertidumbre.map((r) => (
                  <div key={r.nivel} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-bloom-mute truncate capitalize">{r.label}</span>
                    <span className="text-xs tabular-nums text-bloom-ink shrink-0">
                      {r.p80.toFixed(2)}× <span className="text-bloom-mute">({r.n})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Bloque>
        )}
      </div>
    </div>
  );
}
