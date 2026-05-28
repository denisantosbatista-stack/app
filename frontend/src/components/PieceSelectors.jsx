import { useState } from "react";
import { Crown } from "lucide-react";
import PieceShape from "@/components/PieceShape";
import { PIECES, PIECE_CATEGORIES, STYLES } from "@/data/palettes";

export function StyleSelector({ activeStyleId, onChange, activeStyle }) {
  const [tab, setTab] = useState("classico"); // classico | luxo

  const classicStyles = STYLES.filter((s) => s.category !== "luxo");
  const luxoStyles = STYLES.filter((s) => s.category === "luxo");
  const list = tab === "luxo" ? luxoStyles : classicStyles;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-display text-xl tracking-tight">Estilo</h3>
        <span className="text-xs text-zinc-500 italic truncate max-w-[60%]">
          {activeStyle?.description}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-ink-surface rounded-sm w-fit border border-black/[0.06]">
        <button
          onClick={() => setTab("classico")}
          className={`text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all ${
            tab === "classico" ? "bg-white shadow-sm text-ink-text" : "text-zinc-500 hover:text-ink-text"
          }`}
          data-testid="style-tab-classico"
        >
          Clássicos
        </button>
        <button
          onClick={() => setTab("luxo")}
          className={`text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all inline-flex items-center gap-1 ${
            tab === "luxo" ? "bg-white shadow-sm text-gold-deep" : "text-zinc-500 hover:text-gold-deep"
          }`}
          data-testid="style-tab-luxo"
        >
          <Crown className="w-3 h-3" />
          Luxo
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
        {list.map((s) => {
          const active = activeStyleId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`relative text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                active
                  ? "bg-gold text-ink shadow-gold"
                  : "border border-black/10 text-zinc-700 hover:border-gold/40"
              }`}
              data-testid={`style-${s.id}`}
            >
              {s.premium && (
                <Crown className={`w-2.5 h-2.5 inline-block mr-1 -mt-0.5 ${active ? "text-ink" : "text-gold-deep"}`} />
              )}
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PieceSelector({ activePieceId, onChange, palette }) {
  return (
    <div>
      <h3 className="font-display text-xl tracking-tight mb-3">Tipo de peça</h3>
      <div className="space-y-4">
        {PIECE_CATEGORIES.map((cat) => {
          const items = PIECES.filter((p) => p.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id} data-testid={`piece-cat-${cat.id}`}>
              <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 mb-2 flex items-center gap-2">
                <span className="h-px w-4 bg-gold/30" />
                {cat.label}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {items.map((p) => {
                  const active = activePieceId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onChange(p.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-sm transition-all ${
                        active
                          ? "bg-ink-elevated ring-1 ring-gold shadow-gold"
                          : "bg-ink-surface ring-1 ring-black/[0.06] hover:ring-black/20"
                      }`}
                      data-testid={`piece-${p.id}`}
                    >
                      <div className="w-12 h-12">
                        <PieceShape piece={p} palette={palette} size={48} animated={false} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-700 text-center leading-tight">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
