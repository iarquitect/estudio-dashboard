import { useMemo } from "react";

const PALETTE = [
  { fill: "#a8c5e8", text: "#3a5a7a" },  // azul
  { fill: "#a3c9a8", text: "#3a5a3f" },  // verde
  { fill: "#d6c5b8", text: "#5a4a3a" },  // arena
  { fill: "#c8b8e0", text: "#4a3a5a" },  // violeta
  { fill: "#f0b896", text: "#7a4a3a" },  // naranja
  { fill: "#f0d795", text: "#5a4a1a" },  // ámbar
  { fill: "#e8a8a8", text: "#7a3a3a" },  // rosa
];

// Layout determinístico: el más grande arriba a la izquierda, después en zig-zag
const LAYOUT = [
  { cx: 0.42, cy: 0.42, rMul: 1.0  },  // 1° (más grande)
  { cx: 0.20, cy: 0.40, rMul: 0.85 },  // 2°
  { cx: 0.72, cy: 0.50, rMul: 0.72 },  // 3°
  { cx: 0.40, cy: 0.78, rMul: 0.58 },  // 4°
  { cx: 0.16, cy: 0.74, rMul: 0.48 },  // 5°
  { cx: 0.78, cy: 0.80, rMul: 0.40 },  // 6°
  { cx: 0.92, cy: 0.32, rMul: 0.30 },  // 7°
];

const WIDTH  = 520;
const HEIGHT = 340;
const MAX_R  = 88;

export function CategoriaChart({ categorias }) {
  const data = useMemo(() => {
    const sorted = [...(categorias ?? [])]
      .filter((c) => c.categoria && c.horas_real > 0)
      .sort((a, b) => (b.horas_real ?? 0) - (a.horas_real ?? 0))
      .slice(0, 7);

    const total = sorted.reduce((s, c) => s + (Number(c.horas_real) || 0), 0) || 1;
    const maxVal = sorted[0]?.horas_real || 1;

    return sorted.map((c, i) => {
      const layout = LAYOUT[i] ?? LAYOUT[LAYOUT.length - 1];
      const palette = PALETTE[i % PALETTE.length];
      // El radio es proporcional a sqrt(value) para que el área sea proporcional al valor
      const r = MAX_R * Math.sqrt((Number(c.horas_real) || 0) / maxVal) * layout.rMul;
      return {
        ...c,
        cx: layout.cx * WIDTH,
        cy: layout.cy * HEIGHT,
        r,
        fill: palette.fill,
        textColor: palette.text,
        pct: ((Number(c.horas_real) || 0) / total) * 100,
      };
    });
  }, [categorias]);

  return (
    <div className="card">
      <div className="mb-5">
        <p className="card-eyebrow">Reparto del esfuerzo</p>
        <h3 className="card-title mt-1">En qué invertimos nuestro tiempo</h3>
        <p className="card-sub mt-1">Cada burbuja representa una categoría de trabajo. El tamaño es proporcional a las horas reales dedicadas.</p>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" style={{ maxHeight: 340 }}>
        {data.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.cx} cy={c.cy} r={c.r}
              fill={c.fill} fillOpacity={0.6}
              stroke={c.fill} strokeOpacity={0.9} strokeWidth={1}
            />
            {c.r > 30 && (
              <>
                <text
                  x={c.cx} y={c.cy - 4}
                  textAnchor="middle"
                  fontFamily="Spectral, Georgia, serif"
                  fontSize={c.r > 60 ? 28 : 20}
                  fontWeight={500}
                  fill={c.textColor}
                >
                  {Math.round(c.pct)}%
                </text>
                <text
                  x={c.cx} y={c.cy + (c.r > 60 ? 18 : 14)}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize={c.r > 60 ? 12 : 10}
                  fill={c.textColor}
                  opacity={0.85}
                >
                  {c.categoria}
                </text>
              </>
            )}
            {c.r <= 30 && c.r > 16 && (
              <text
                x={c.cx} y={c.cy + 3}
                textAnchor="middle"
                fontFamily="Spectral, Georgia, serif"
                fontSize={12}
                fontWeight={500}
                fill={c.textColor}
              >
                {Math.round(c.pct)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Mini-leyenda para burbujas pequeñas */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {data.filter((c) => c.r <= 30).map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-bloom-mute">
            <span className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
            {c.categoria}
          </span>
        ))}
      </div>
    </div>
  );
}
