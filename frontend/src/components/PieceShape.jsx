import { withAlpha, lighten, darken } from "@/utils/color";

// SVG silhouettes for each piece, filled with palette gradients
export default function PieceShape({ piece, palette, size = 320, animated = true }) {
  // Normaliza hex: trata vazio / "#000" / "#000000" como ausente
  // para evitar blocos pretos quando a paleta não define a cor (ex.: "veios").
  const safeHex = (hex, fallback) => {
    const v = (hex || "").trim().toLowerCase();
    if (!v || v === "#000" || v === "#000000") return fallback;
    return hex;
  };
  const main = safeHex(palette.colors[0]?.hex, "#fff");
  const accent = safeHex(palette.colors[1]?.hex, "#aaa");
  const detail = safeHex(palette.colors[2]?.hex, "#eee");
  // Veios: se ausente ou puro preto, cai para dourado neutro (não cria bloco preto).
  const veins = safeHex(palette.colors[3]?.hex, "#D4AF37");

  const gradId = `g-${piece.id}`;
  const shadowId = `s-${piece.id}`;
  const veinId = `v-${piece.id}`;

  const defs = (
    <defs>
      <radialGradient id={gradId} cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor={lighten(main, 0.35)} />
        <stop offset="40%" stopColor={main} />
        <stop offset="80%" stopColor={accent} />
        <stop offset="100%" stopColor={darken(accent, 0.3)} />
      </radialGradient>
      <linearGradient id={veinId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={withAlpha(veins, 0)} />
        <stop offset="50%" stopColor={veins} />
        <stop offset="100%" stopColor={withAlpha(veins, 0)} />
      </linearGradient>
      <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
        <feOffset dx="0" dy="8" />
        <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id={`hl-${piece.id}`} cx="30%" cy="20%" r="50%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
  );

  const shapes = {
    drop: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M160 30 C 100 110, 70 170, 100 230 C 130 290, 190 290, 220 230 C 250 170, 220 110, 160 30 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.4)}
          strokeWidth="1"
        />
        <path
          d="M120 100 Q 160 140 200 120 Q 180 180 210 220"
          fill="none"
          stroke={`url(#${veinId})`}
          strokeWidth="2"
          opacity="0.7"
        />
        <ellipse cx="135" cy="90" rx="40" ry="60" fill={`url(#hl-${piece.id})`} opacity="0.6" />
      </g>
    ),
    hex: (
      <g filter={`url(#${shadowId})`}>
        <polygon
          points="160,30 260,90 260,210 160,270 60,210 60,90"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <polyline
          points="80,100 160,150 240,100"
          fill="none"
          stroke={`url(#${veinId})`}
          strokeWidth="2"
          opacity="0.7"
        />
        <polygon points="160,30 260,90 160,150 60,90" fill={`url(#hl-${piece.id})`} opacity="0.4" />
      </g>
    ),
    ring: (
      <g filter={`url(#${shadowId})`}>
        <circle cx="160" cy="160" r="100" fill={withAlpha(detail, 0.1)} stroke={accent} strokeWidth="2" />
        <circle cx="160" cy="160" r="100" fill="none" stroke={`url(#${gradId})`} strokeWidth="24" />
        <circle cx="160" cy="60" r="14" fill={`url(#${gradId})`} stroke={veins} strokeWidth="1.5" />
        <path d="M70 160 Q 160 100 250 160" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.5" opacity="0.6" />
      </g>
    ),
    oval: (
      <g filter={`url(#${shadowId})`}>
        <ellipse cx="160" cy="160" rx="80" ry="120" fill={`url(#${gradId})`} stroke={withAlpha(veins, 0.4)} strokeWidth="1" />
        <path d="M100 100 Q 160 160 220 110 Q 180 220 210 250" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
        <ellipse cx="140" cy="120" rx="28" ry="50" fill={`url(#hl-${piece.id})`} opacity="0.55" />
      </g>
    ),
    bracelet: (
      <g filter={`url(#${shadowId})`}>
        <ellipse cx="160" cy="160" rx="120" ry="60" fill={withAlpha(detail, 0.05)} stroke={accent} strokeWidth="2" />
        <ellipse cx="160" cy="160" rx="120" ry="60" fill="none" stroke={`url(#${gradId})`} strokeWidth="22" />
        <path d="M50 160 Q 160 100 270 160" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.6" />
      </g>
    ),
    tray: (
      <g filter={`url(#${shadowId})`}>
        <rect x="40" y="80" width="240" height="160" rx="20" fill={`url(#${gradId})`} stroke={withAlpha(veins, 0.5)} strokeWidth="1.2" />
        <path d="M60 120 Q 150 160 280 130" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
        <path d="M60 180 Q 180 220 280 190" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.5" opacity="0.5" />
        <rect x="40" y="80" width="240" height="60" rx="20" fill={`url(#hl-${piece.id})`} opacity="0.4" />
      </g>
    ),
    circle: (
      <g filter={`url(#${shadowId})`}>
        <circle cx="160" cy="170" r="100" fill={`url(#${gradId})`} stroke={withAlpha(veins, 0.5)} strokeWidth="1" />
        <circle cx="160" cy="50" r="8" fill="none" stroke={veins} strokeWidth="2" />
        <line x1="160" y1="58" x2="160" y2="70" stroke={veins} strokeWidth="2" />
        <path d="M80 150 Q 160 200 240 140" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
        <circle cx="135" cy="140" r="35" fill={`url(#hl-${piece.id})`} opacity="0.6" />
      </g>
    ),
    heart: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M160 260 C 80 210, 30 150, 70 90 C 100 50, 145 60, 160 100 C 175 60, 220 50, 250 90 C 290 150, 240 210, 160 260 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.4)}
          strokeWidth="1"
        />
        <path d="M90 110 Q 160 150 230 115" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
      </g>
    ),
    leaf: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M80 240 Q 90 60 240 80 Q 250 230 80 240 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.4)}
          strokeWidth="1"
        />
        <path d="M80 240 Q 160 180 240 80" fill="none" stroke={`url(#${veinId})`} strokeWidth="2.5" opacity="0.7" />
        <path d="M130 200 Q 160 160 200 130" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.2" opacity="0.5" />
      </g>
    ),
    bookmark: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M100 40 L 220 40 L 220 280 L 160 240 L 100 280 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <path d="M110 80 Q 160 130 210 90" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
        <path d="M110 140 Q 170 180 210 150" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.4" opacity="0.5" />
      </g>
    ),
    moon: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M180 40 A 130 130 0 1 0 180 280 A 95 95 0 1 1 180 40 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.4)}
          strokeWidth="1"
        />
        <path d="M120 100 Q 150 160 110 220" fill="none" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.7" />
      </g>
    ),
    star: (
      <g filter={`url(#${shadowId})`}>
        <polygon
          points="160,30 195,125 295,125 215,185 245,285 160,225 75,285 105,185 25,125 125,125"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <polygon
          points="160,30 195,125 125,125"
          fill={`url(#hl-${piece.id})`}
          opacity="0.5"
        />
      </g>
    ),
    feather: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M90 280 Q 130 100 200 50 Q 270 110 240 220 Q 200 250 130 250 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.4)}
          strokeWidth="1"
        />
        <line x1="200" y1="50" x2="90" y2="280" stroke={`url(#${veinId})`} strokeWidth="2" opacity="0.6" />
        {[0.25, 0.4, 0.55, 0.7, 0.85].map((t) => (
          <line
            key={t}
            x1={200 - (200 - 90) * t}
            y1={50 + (280 - 50) * t}
            x2={200 - (200 - 90) * t + 60 - t * 40}
            y2={50 + (280 - 50) * t - 30 + t * 20}
            stroke={`url(#${veinId})`}
            strokeWidth="1.2"
            opacity="0.5"
          />
        ))}
      </g>
    ),
    prism: (
      <g filter={`url(#${shadowId})`}>
        <polygon
          points="160,30 280,250 40,250"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <polygon points="160,30 280,250 160,180" fill={accent} opacity="0.35" />
        <polygon points="160,30 40,250 160,180" fill={`url(#hl-${piece.id})`} opacity="0.4" />
        <line x1="160" y1="30" x2="160" y2="180" stroke={veins} strokeWidth="1" opacity="0.6" />
      </g>
    ),
    cube: (
      <g filter={`url(#${shadowId})`}>
        <polygon
          points="80,90 160,50 240,90 240,210 160,250 80,210"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <polygon points="80,90 160,50 240,90 160,130" fill={`url(#hl-${piece.id})`} opacity="0.55" />
        <polygon points="240,90 240,210 160,250 160,130" fill={accent} opacity="0.3" />
        <line x1="160" y1="130" x2="160" y2="250" stroke={veins} strokeWidth="1" opacity="0.4" />
      </g>
    ),
    coaster: (
      <g filter={`url(#${shadowId})`}>
        <circle cx="160" cy="160" r="118" fill={`url(#${gradId})`} stroke={withAlpha(veins, 0.5)} strokeWidth="1.5" />
        <circle cx="160" cy="160" r="118" fill="none" stroke={accent} strokeWidth="2" opacity="0.6" />
        <circle cx="160" cy="160" r="100" fill="none" stroke={withAlpha(veins, 0.3)} strokeWidth="0.8" strokeDasharray="2 4" />
        <path d="M75 130 Q 160 170 245 125" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.6" opacity="0.6" />
        <path d="M70 195 Q 170 230 250 190" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.2" opacity="0.5" />
      </g>
    ),
    sousplat: (
      <g filter={`url(#${shadowId})`}>
        <circle cx="160" cy="160" r="128" fill={accent} opacity="0.3" />
        <circle cx="160" cy="160" r="118" fill={`url(#${gradId})`} stroke={withAlpha(veins, 0.5)} strokeWidth="1.5" />
        <circle cx="160" cy="160" r="60" fill={detail} opacity="0.45" stroke={withAlpha(veins, 0.4)} strokeWidth="1" />
        <path d="M55 145 Q 160 195 265 140" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.5" opacity="0.5" />
      </g>
    ),
    lamp: (
      <g filter={`url(#${shadowId})`}>
        <path
          d="M110 60 L 210 60 L 230 200 Q 230 240 160 250 Q 90 240 90 200 Z"
          fill={`url(#${gradId})`}
          stroke={withAlpha(veins, 0.5)}
          strokeWidth="1.2"
        />
        <ellipse cx="160" cy="60" rx="50" ry="10" fill={accent} opacity="0.8" />
        <rect x="148" y="250" width="24" height="14" fill={veins} opacity="0.6" />
        <rect x="100" y="264" width="120" height="6" rx="2" fill={detail} opacity="0.7" />
        <path d="M110 130 Q 160 170 210 130" fill="none" stroke={`url(#${veinId})`} strokeWidth="1.8" opacity="0.7" />
        <ellipse cx="135" cy="120" rx="18" ry="40" fill={`url(#hl-${piece.id})`} opacity="0.6" />
      </g>
    ),
  };

  const shape = shapes[piece.shape] || shapes.drop;

  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={animated ? "transition-transform duration-700 ease-out hover:scale-[1.02]" : ""}
      data-testid={`piece-shape-${piece.id}`}
    >
      {defs}
      {shape}
    </svg>
  );
}
