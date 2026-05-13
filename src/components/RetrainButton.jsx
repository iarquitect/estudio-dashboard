import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";

// Configurar en Vercel → Environment Variables:
//   VITE_GITHUB_TOKEN  →  PAT con scope: workflow
//   VITE_GITHUB_REPO   →  "owner/repo"  (ej: iarquitect/estudio-dashboard)
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REPO  = import.meta.env.VITE_GITHUB_REPO;
const WORKFLOW = "main.yml";

const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

// Estados:  idle → dispatching → queued → running → deploying → done | error
const STATES = {
  idle:        { label: "Retrain ahora",        Icon: RefreshCw,  cls: "bg-sky-600 hover:bg-sky-500",     spin: false },
  dispatching: { label: "Iniciando job...",     Icon: Loader2,    cls: "bg-sky-800",                       spin: true  },
  queued:      { label: "En cola en GitHub...", Icon: Clock,      cls: "bg-amber-700",                     spin: false },
  running:     { label: "Entrenando modelo...", Icon: Loader2,    cls: "bg-amber-600",                     spin: true  },
  deploying:   { label: "Desplegando datos...", Icon: Loader2,    cls: "bg-violet-700",                    spin: true  },
  done:        { label: "Datos actualizados",   Icon: CheckCircle,cls: "bg-green-700 hover:bg-green-600",  spin: false },
  error:       { label: "Error",                Icon: AlertCircle,cls: "bg-rose-700 hover:bg-rose-600",    spin: false },
};

export function RetrainButton({ generatedAt, onRefresh }) {
  const [status, setStatus]   = useState("idle");
  const [tooltip, setTooltip] = useState(null);
  const pollRef = useRef(null);

  // Cleanup al desmontar
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; } };
  const schedule    = (fn, ms) => { pollRef.current = setTimeout(fn, ms); };

  const resetSoon = (delay = 6000) => {
    schedule(() => { setStatus("idle"); setTooltip(null); }, delay);
  };

  // Polling: espera a que el workflow run termine, luego espera a Vercel y refresca data
  const pollRun = async (dispatchedAt, attempts = 0) => {
    if (attempts > 90) {  // ~6 min máximo
      setStatus("error");
      setTooltip("Timeout esperando el workflow");
      resetSoon();
      return;
    }
    try {
      const url = `https://api.github.com/repos/${GH_REPO}/actions/runs?event=workflow_dispatch&per_page=5`;
      const res = await fetch(url, { headers: ghHeaders });
      if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
      const { workflow_runs = [] } = await res.json();

      // Buscar el run creado después de nuestro dispatch
      const myRun = workflow_runs.find((r) => new Date(r.created_at) >= dispatchedAt);

      if (!myRun) {
        schedule(() => pollRun(dispatchedAt, attempts + 1), 3000);
        return;
      }

      setTooltip(`Run #${myRun.run_number} · ${myRun.status}`);

      if (myRun.status === "completed") {
        if (myRun.conclusion === "success") {
          // El JSON ya fue commiteado al repo. Esperamos a que Vercel redespliegue.
          setStatus("deploying");
          await waitForFreshJson(generatedAt);
          setStatus("done");
          onRefresh?.();
          resetSoon(5000);
        } else {
          setStatus("error");
          setTooltip(`Workflow falló: ${myRun.conclusion}`);
          resetSoon();
        }
        return;
      }

      setStatus(myRun.status === "queued" ? "queued" : "running");
      schedule(() => pollRun(dispatchedAt, attempts + 1), 4000);
    } catch (e) {
      setStatus("error");
      setTooltip(e.message);
      resetSoon();
    }
  };

  // Poll del JSON hasta que cambie el timestamp generated_at
  const waitForFreshJson = async (oldGeneratedAt, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const r = await fetch(`/dashboard_data.json?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (j.meta?.generated_at && j.meta.generated_at !== oldGeneratedAt) return true;
        }
      } catch { /* deploy en curso, reintentar */ }
      await new Promise((res) => setTimeout(res, 3000));
    }
    return false;
  };

  const trigger = async () => {
    if (!GH_TOKEN || !GH_REPO) {
      setStatus("error");
      setTooltip("Faltan VITE_GITHUB_TOKEN / VITE_GITHUB_REPO en Vercel");
      resetSoon();
      return;
    }
    stopPolling();
    setStatus("dispatching");
    setTooltip(null);
    const dispatchedAt = new Date();

    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: { ...ghHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            ref: "main",
            inputs: { reason: "Retrain manual desde dashboard" },
          }),
        }
      );
      if (res.status !== 204) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
      }
      // Esperar a que el run aparezca en la API
      schedule(() => pollRun(dispatchedAt), 3500);
    } catch (e) {
      setStatus("error");
      setTooltip(e.message);
      resetSoon();
    }
  };

  const s = STATES[status];
  const isBusy = ["dispatching", "queued", "running", "deploying"].includes(status);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={trigger}
        disabled={isBusy}
        title={tooltip ?? undefined}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${s.cls} ${isBusy ? "cursor-wait" : "cursor-pointer"} disabled:opacity-90`}
      >
        <s.Icon size={14} className={s.spin ? "animate-spin" : ""} />
        {s.label}
      </button>
      {tooltip && status !== "idle" && status !== "done" && (
        <p className="text-[10px] text-gray-500 max-w-[280px] truncate">{tooltip}</p>
      )}
      {generatedAt && (
        <p className="text-xs text-gray-600">
          Última actualización:{" "}
          {new Date(generatedAt).toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
