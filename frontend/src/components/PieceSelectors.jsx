import PieceShape from "@/components/PieceShape";
import { PIECES, STYLES } from "@/data/palettes";

export function StyleSelector({ activeStyleId, onChange, activeStyle }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xl tracking-tight">Estilo</h3>
        <span className="text-xs text-zinc-500">{activeStyle.description}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
              activeStyleId === s.id
                ? "bg-gold text-ink shadow-gold"
                : "border border-white/10 text-zinc-300 hover:border-gold/40"
            }`}
            data-testid={`style-${s.id}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PieceSelector({ activePieceId, onChange, palette }) {
  return (
    <div>
      <h3 className="font-display text-xl tracking-tight mb-3">Tipo de peça</h3>
      <div className="grid grid-cols-5 gap-2">
        {PIECES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-sm transition-all ${
              activePieceId === p.id
                ? "bg-ink-elevated ring-1 ring-gold shadow-gold"
                : "bg-ink-surface ring-1 ring-white/[0.06] hover:ring-white/20"
            }`}
            data-testid={`piece-${p.id}`}
          >
            <div className="w-12 h-12">
              <PieceShape piece={p} palette={palette} size={48} animated={false} />
            </div>
            <span className="text-[9px] uppercase tracking-wider text-zinc-300">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
