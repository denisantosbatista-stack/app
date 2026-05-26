import { withAlpha, lighten, darken } from "@/utils/color";

// SVG silhouettes for each piece, filled with palette gradients
export default function PieceShape({ piece, palette, size = 320, animated = true }) {
  const main = palette.colors[0]?.hex || "#fff";
  const accent = palette.colors[1]?.hex || "#aaa";
  const detail = palette.colors[2]?.hex || "#eee";
  const veins = palette.colors[3]?.hex || "#D4AF37";

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
