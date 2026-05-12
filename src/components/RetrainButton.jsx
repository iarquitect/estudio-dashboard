import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

// Set these in Vercel environment variables:
//   VITE_GITHUB_TOKEN  → PAT with actions:write scope
//   VITE_GITHUB_REPO   → "owner/repo"
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REPO  = import.meta.env.VITE_GITHUB_REPO;
const WORKFLOW = "main.yml";

export function RetrainButton({ generatedAt }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  const trigger = async () => {
    if (!GH_TOKEN || !GH_REPO) {
      alert("Configurá VITE_GITHUB_TOKEN y VITE_GITHUB_REPO en Vercel.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main", inputs: { reason: "Retrain desde dashboard" } }),
        }
      );
      // 204 = accepted, no body
      setStatus(res.status === 204 ? "ok" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 4000);
  };

  const label = {
    idle:    "Retrain ahora",
    loading: "Enviando...",
    ok:      "¡Encolado!",
    error:   "Error — revisá consola",
  }[status];

  const Icon  = { idle: RefreshCw, loading: RefreshCw, ok: CheckCircle, error: AlertCircle }[status];
  const color = { idle: "bg-sky-600 hover:bg-sky-500", loading: "bg-sky-800", ok: "bg-green-700", error: "bg-rose-700" }[status];

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={trigger}
        disabled={status === "loading"}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${color} disabled:cursor-not-allowed`}
      >
        <Icon size={14} className={status === "loading" ? "animate-spin" : ""} />
        {label}
      </button>
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
