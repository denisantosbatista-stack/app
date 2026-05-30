import { useMemo, useState } from "react";
import { Crown, Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filteredPieces = useMemo(
    () =>
      normalized
        ? PIECES.filter((p) => p.label.toLowerCase().includes(normalized) || p.shape.toLowerCase().includes(normalized))
        : PIECES,
    [normalized]
  );
  const hasResults = filteredPieces.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-display text-xl tracking-tight">Tipo de peça</h3>
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar peça…"
            aria-label="Buscar tipo de peça"
            className="w-full bg-ink-surface border border-black/[0.08] rounded-sm pl-8 pr-7 py-1.5 text-[11px] tracking-wide text-ink-text placeholder:text-zinc-400 focus:outline-none focus:border-gold/50 transition-colors"
            data-testid="piece-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-ink-text"
              data-testid="piece-search-clear"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {!hasResults && (
        <div
          className="text-[11px] text-zinc-500 italic px-1 py-3"
          data-testid="piece-search-empty"
        >
          Nenhuma peça encontrada para "{query}".
        </div>
      )}

      <div className="space-y-4">
        {PIECE_CATEGORIES.map((cat) => {
          const items = filteredPieces.filter((p) => p.category === cat.id);
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
