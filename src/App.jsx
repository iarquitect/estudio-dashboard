import {
  Activity, Clock, Target, TrendingUp,
} from "lucide-react";
import { useDashboardData }   from "./hooks/useDashboardData";
import { KPICard }            from "./components/KPICard";
import { SprintBarChart }     from "./components/SprintBarChart";
import { CalibrationScatter } from "./components/CalibrationScatter";
import { CategoriaChart }     from "./components/CategoriaChart";
import { PersonaChart }       from "./components/PersonaChart";
import { MLPanel }            from "./components/MLPanel";
import { RetrainButton }      from "./components/RetrainButton";

// Coerción numérica defensiva — convierte string/null/undefined → number
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function computeKPIs(data) {
  const registros = data.registros ?? [];
  const sprints   = data.sprints   ?? [];
  const meta      = data.meta      ?? {};

  const totalHoras = registros.reduce((s, r) => s + num(r.horas_real), 0);
  const totalEst   = registros.reduce((s, r) => s + num(r.puntos_est), 0);
  const bufferH    = registros
    .filter((r) => r.categoria === "Buffer de Interrupción")
    .reduce((s, r) => s + num(r.horas_real), 0);

  const calibracion = totalEst > 0 ? ((totalHoras - totalEst) / totalEst) * 100 : 0;
  const bufferPct   = totalHoras > 0 ? (bufferH / totalHoras) * 100 : 0;

  const lastSprint = sprints.at(-1);
  const velocity   = num(lastSprint?.horas_real);

  return {
    totalHoras, calibracion, bufferPct, velocity,
    nSprints: meta.n_sprints ?? 0,
    lastSprintName: lastSprint?.sprint ?? "—",
  };
}

function Spinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500">Cargando datos...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-rose-400 px-6">
      <p>Error al cargar datos: {message}</p>
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
    registros    = [],
    sprints      = [],
    personas     = [],
    proyectos    = [],
    categorias   = [],
    meta         = {},
  } = data;

  return (
    <div className="min-h-screen bg-gray-950 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Estudio Mario Isgró</h1>
            <p className="text-xs text-gray-500">
              Sprint Dashboard · {meta.n_sprints ?? 0} sprints · {meta.n_registros ?? 0} registros
            </p>
          </div>
          <RetrainButton generatedAt={meta.generated_at} onRefresh={refetch} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Clock}
            title="Horas Totales"
            value={`${kpi.totalHoras.toFixed(0)} h`}
            sub={`${meta.n_registros ?? 0} tareas registradas`}
            color="sky"
          />
          <KPICard
            icon={TrendingUp}
            title="Velocity Último Sprint"
            value={`${kpi.velocity.toFixed(1)} h`}
            sub={kpi.lastSprintName}
            color="green"
          />
          <KPICard
            icon={Target}
            title="Desviación Global"
            value={`${kpi.calibracion >= 0 ? "+" : ""}${kpi.calibracion.toFixed(1)}%`}
            sub="(Real − Est) / Est · negativo = más rápido"
            color={kpi.calibracion > 10 ? "rose" : kpi.calibracion < -5 ? "green" : "amber"}
          />
          <KPICard
            icon={Activity}
            title="Buffer de Interrupción"
            value={`${kpi.bufferPct.toFixed(1)}%`}
            sub="% horas reales en interrupciones"
            color={kpi.bufferPct > 30 ? "rose" : "violet"}
          />
        </div>

        {/* Sprint chart — full width */}
        <SprintBarChart sprints={sprints} />

        {/* Calibración + Categoría */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CalibrationScatter registros={registros} />
          <CategoriaChart     categorias={categorias} />
        </div>

        {/* Persona chart */}
        <PersonaChart personas={personas} />

        {/* ML Panel — full width */}
        <MLPanel registros={registros} model={meta.model} />

        {/* Proyectos table */}
        <div className="card">
          <p className="card-title mb-3">Proyectos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4">Proyecto</th>
                  <th className="pb-2 pr-4">Tipo</th>
                  <th className="pb-2 pr-4 text-right">Tareas</th>
                  <th className="pb-2 pr-4 text-right">Est. (pts)</th>
                  <th className="pb-2 text-right">Real (h)</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 pr-4 font-medium text-white">{p.proyecto}</td>
                    <td className="py-2 pr-4 text-gray-400">{p.tipo_proyecto}</td>
                    <td className="py-2 pr-4 text-right text-gray-300">{num(p.n_tareas)}</td>
                    <td className="py-2 pr-4 text-right text-sky-400">{num(p.puntos_est).toFixed(1)}</td>
                    <td className="py-2 text-right text-orange-400 font-medium">{num(p.horas_real).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
