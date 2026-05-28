import { Search } from "lucide-react";
import PaletteCard from "@/components/PaletteCard";
import { STYLES } from "@/data/palettes";

export default function PaletteGrid({
  palettes,
  activePaletteId,
  savedIds,
  favoriteIds,
  search,
  filterStyle,
  onSearchChange,
  onFilterChange,
  onPaletteClick,
  onFavorite,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-tight">Paletas</h2>
        <span className="text-xs text-zinc-500">{palettes.length} disponíveis</span>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar paleta, tag ou cor…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10"
            data-testid="palette-search"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1">
          <FilterChip id="todos" label="Todos" active={filterStyle === "todos"} onClick={onFilterChange} />
          {STYLES.map((s) => (
            <FilterChip key={s.id} id={s.id} label={s.label} active={filterStyle === s.id} onClick={onFilterChange} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[68vh] overflow-y-auto pr-1">
        {palettes.map((p, i) => (
          <PaletteCard
            key={p.id}
            palette={p}
            index={i}
            active={p.id === activePaletteId}
            favorite={favoriteIds.has(p.id)}
            onClick={() => onPaletteClick(p.id)}
            onFavorite={onFavorite}
          />
        ))}
        {palettes.length === 0 && (
          <div className="col-span-2 text-center py-12 text-zinc-500 text-sm">
            Nenhuma paleta encontrada.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`text-[10px] px-3 py-1.5 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
        active ? "bg-gold text-ink" : "border border-black/10 text-zinc-700 hover:border-gold/40"
      }`}
      data-testid={`filter-${id}`}
    >
      {label}
    </button>
  );
}
