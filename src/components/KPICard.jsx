export function KPICard({ icon: Icon, title, value, sub, accent = "blue" }) {
  // Cada KPI usa un acento sutil distinto
  const accents = {
    blue:   { ring: "border-bloom-blue/40",   icon: "text-bloom-bluedk",   bg: "bg-bloom-blue/15"   },
    green:  { ring: "border-bloom-green/40",  icon: "text-bloom-greendk",  bg: "bg-bloom-green/15"  },
    amber:  { ring: "border-bloom-amber/40",  icon: "text-bloom-amberdk",  bg: "bg-bloom-amber/15"  },
    rose:   { ring: "border-bloom-rose/40",   icon: "text-bloom-rosedk",   bg: "bg-bloom-rose/20"   },
    violet: { ring: "border-bloom-violet/40", icon: "text-bloom-violetdk", bg: "bg-bloom-violet/15" },
    sage:   { ring: "border-bloom-sage/40",   icon: "text-bloom-sage",     bg: "bg-bloom-sage/15"   },
  };
  const a = accents[accent] ?? accents.blue;

  return (
    <div className={`card flex items-start gap-4 ${a.ring}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${a.bg}`}>
        <Icon size={20} strokeWidth={1.5} className={a.icon} />
      </div>
      <div className="min-w-0">
        <p className="card-eyebrow mb-2">{title}</p>
        <p className="stat-num">{value}</p>
        {sub && <p className="text-xs text-bloom-mute mt-2 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}
