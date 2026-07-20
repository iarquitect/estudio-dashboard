import {
  Clock, Gauge, Crosshair, AlertTriangle,
  Home, Building2, Trophy, Briefcase, Hotel, Trees, Hammer, Layers,
} from "lucide-react";
import { useDashboardData }   from "./hooks/useDashboardData";
import { KPICard }            from "./components/KPICard";
import { SprintBarChart }     from "./components/SprintBarChart";
import { CalibrationScatter } from "./components/CalibrationScatter";
import { CategoriaChart }     from "./components/CategoriaChart";
import { PersonaChart }       from "./components/PersonaChart";
import { MLPanel }            from "./components/MLPanel";
import { CapacityPanel }      from "./components/CapacityPanel";
import { RetrainButton }      from "./components/RetrainButton";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function computeKPIs(data) {
  const registros = data.registros ?? [];
  const sprints   = data.sprints   ?? [];
  const meta      = data.meta      ?? {};

  const totalHoras = registros.reduce((s, r) => s + num(r.horas_real), 0);
  const bufferH    = registros
    .filter((r) => r.categoria === "Buffer de Interrupción")
    .reduce((s, r) => s + num(r.horas_real), 0);

  // MAPE — Mean Absolute Percentage Error. Promedio del error absoluto por tarea.
  // Evita la cancelación entre tareas sobreestimadas y subestimadas que
  // producía un falso "casi 0%" en el cálculo agregado anterior.
  const tareasParaMape = registros.filter(
    (r) => num(r.puntos_est) > 0 && r.horas_real != null,
  );
  const mape = tareasParaMape.length
    ? (tareasParaMape.reduce((s, r) => {
        const est  = num(r.puntos_est);
        const real = num(r.horas_real);
        return s + Math.abs((real - est) / est);
      }, 0) / tareasParaMape.length) * 100
    : 0;

  const bufferPct = totalHoras > 0 ? (bufferH / totalHoras) * 100 : 0;

  const lastSprint = sprints.at(-1);
  const velocity   = num(lastSprint?.horas_real);

  return {
    totalHoras, mape, bufferPct, velocity,
    nSprints: meta.n_sprints ?? 0,
    lastSprintName: lastSprint?.sprint ?? "—",
    nTareasMape: tareasParaMape.length,
  };
}

// Mapping de tipo de proyecto → ícono
const TIPO_ICON = {
  "Residencial":     Home,
  "Industrial":      Hammer,
  "Industria":       Hammer,
  "Comercial":       Briefcase,
  "Espacio Público": Trees,
  "Hoteleria":       Hotel,
  "Hotelería":       Hotel,
  "Educacional":     Building2,
  "Salud":           Building2,
  "Cultural":        Trophy,
  "Deportivo":       Trophy,
  "Logística":       Briefcase,
  "Logística":  Briefcase,
};

function Spinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bloom-paper">
      <div className="w-8 h-8 border-2 border-bloom-bluedk border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-bloom-mute font-sans">Cargando datos…</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-bloom-rosedk px-6 bg-bloom-paper">
      <p className="font-sans">Error al cargar datos: {message}</p>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refetch } = useDashboardData();

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;
  if (!data)   return <ErrorState message="Sin datos" />;

  const kpi = computeKPIs(data);
  const {
    registros  = [],
    sprints    = [],
    personas   = [],
    proyectos  = [],
    categorias = [],
    meta       = {},
  } = data;

  return (
    <div className="min-h-screen bg-bloom-paper font-sans text-bloom-ink">
      {/* Header */}
      <header className="border-b border-bloom-line bg-bloom-paper">
        <div className="max-w-7xl mx-auto px-6 py-7 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white border border-bloom-line flex items-center justify-center shrink-0 mt-0.5">
              <Layers size={20} strokeWidth={1.4} className="text-bloom-ink" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-medium text-bloom-ink leading-tight">Estudio Mario Isgró</h1>
              <p className="text-sm text-bloom-mute mt-1">
                Dashboard del estudio · {meta.n_sprints ?? 0} sprints · {meta.n_registros ?? 0} registros
              </p>
            </div>
          </div>
          <RetrainButton generatedAt={meta.generated_at} onRefresh={refetch} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Clock}
            title="Experiencia Acumulada"
            value={`${kpi.totalHoras.toFixed(0)} h`}
            sub={`${meta.n_registros ?? 0} tareas registradas`}
            accent="blue"
          />
          <KPICard
            icon={Gauge}
            title="Ritmo de Trabajo"
            value={`${kpi.velocity.toFixed(1)} h`}
            sub={kpi.lastSprintName}
            accent="green"
          />
          <KPICard
            icon={Crosshair}
            title="Precisión de Planificación"
            value={`${kpi.mape.toFixed(1)}%`}
            sub={`Error absoluto promedio por tarea (MAPE) sobre ${kpi.nTareasMape} tareas · más bajo = mejor calibración`}
            accent={kpi.mape > 30 ? "rose" : kpi.mape > 15 ? "amber" : "green"}
          />
          <KPICard
            icon={AlertTriangle}
            title="Fuga por Imprevistos"
            value={`${kpi.bufferPct.toFixed(1)}%`}
            sub="% de horas reales consumidas por interrupciones"
            accent={kpi.bufferPct > 30 ? "rose" : "violet"}
          />
        </div>

        {/* Sprint chart — full width */}
        <SprintBarChart sprints={sprints} />

        {/* Auditoría + Burbujas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AuditoriaProyectos proyectos={proyectos} />
          <CategoriaChart categorias={categorias} />
        </div>

        {/* Carga del equipo + Mapa de imprevistos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonaChart personas={personas} />
          <CalibrationScatter registros={registros} />
        </div>

        {/* Planificación de capacidad — full width */}
        <CapacityPanel capacity={meta.capacity} />

        {/* Motor predictivo — full width */}
        <MLPanel registros={registros} model={meta.model} baseline={meta.baseline} />

        {/* Footer */}
        <div className="text-center text-xs text-bloom-mute py-4 space-y-1">
          <p>Modelo de predicción re-entrenado semanalmente sobre los registros de Google Sheets.</p>
          {meta.n_sin_horas > 0 && (
            <p>
              {meta.n_sin_horas} tareas tienen estimación cargada pero ninguna hora real registrada
              (planificadas, en curso o sin completar el parte): quedan fuera de todas las métricas.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Auditoría de Proyectos ─────────────────────────────────────────────────────
function AuditoriaProyectos({ proyectos }) {
  // Filtro de UI: excluir el placeholder "No aplica" (los datos completos
  // siguen disponibles en `proyectos` para cualquier cálculo agregado upstream).
  const rows = (proyectos ?? [])
    .filter((p) => p.proyecto && p.proyecto.trim().toLowerCase() !== "no aplica")
    .slice(0, 8);

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Cartera del estudio</p>
        <h3 className="card-title mt-1">Auditoría de proyectos</h3>
        <p className="card-sub mt-1">Cuánto presupuestamos para cada proyecto y cuánto realmente nos llevó completarlo.</p>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-4 items-center text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-mute pb-2 border-b border-bloom-line">
          <span>Proyecto</span>
          <span className="text-right w-16">Tareas</span>
          <span className="text-right w-20">Presupuesto</span>
          <span className="text-right w-24">Invertidas</span>
        </div>

        {rows.map((p, i) => {
          const Icon = TIPO_ICON[p.tipo_proyecto] ?? Briefcase;
          const est = num(p.puntos_est);
          const real = num(p.horas_real);
          const pct = est > 0 ? Math.round((real / est) * 100) : 0;
          const onTrack = pct <= 100;
          return (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-4 items-center py-3 border-b border-bloom-line/60 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-bloom-line/40 flex items-center justify-center shrink-0">
                  <Icon size={16} strokeWidth={1.4} className="text-bloom-mute" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-bloom-ink truncate">{p.proyecto}</p>
                  <p className="text-xs text-bloom-mute">{p.tipo_proyecto}</p>
                </div>
              </div>
              <span className="text-sm text-bloom-mute text-right w-16 tabular-nums">{num(p.n_tareas)}</span>
              <span className="text-sm text-bloom-ink text-right w-20 tabular-nums">{est.toFixed(0)} h</span>
              <div className="text-right w-24">
                <p className="text-sm text-bloom-ink font-medium tabular-nums">{real.toFixed(0)} h</p>
                <p className={`text-xs tabular-nums ${onTrack ? "text-bloom-greendk" : "text-bloom-orangedk"}`}>
                  ● {pct}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
