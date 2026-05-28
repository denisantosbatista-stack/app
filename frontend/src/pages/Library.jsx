import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaletteStore } from "@/store/usePaletteStore";
import ExportModal from "@/components/ExportModal";
import LibraryEmpty from "@/components/LibraryEmpty";
import LibraryCard from "@/components/LibraryCard";

const FILTERS = [
  { id: "todos", label: "Todas" },
  { id: "favoritos", label: "★ Favoritas" },
  { id: "ai", label: "IA" },
  { id: "user", label: "Minhas" },
];

const FILTER_FNS = {
  todos: () => true,
  favoritos: (p) => p.favorite,
  ai: (p) => p.source === "ai",
  user: (p) => p.source === "user",
};

export default function Library() {
  const { saved, loadingSaved, toggleFavorite, deletePalette } = usePaletteStore();
  const [filter, setFilter] = useState("todos");
  const [exportPalette, setExportPalette] = useState(null);
  const captureRef = useRef(null);

  const filtered = useMemo(
    () => saved.filter(FILTER_FNS[filter] || FILTER_FNS.todos),
    [saved, filter]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12" data-testid="library-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between flex-wrap gap-4 mb-10"
      >
        <div>
          <div className="label-eyebrow text-gold mb-3">Biblioteca</div>
          <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
            Sua coleção <span className="italic gold-shimmer">curada</span>
          </h1>
          <p className="text-zinc-600 mt-3 max-w-xl">
            Paletas favoritas, criações pessoais e descobertas da IA — tudo sincronizado.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] transition-all ${
                filter === f.id
                  ? "bg-gold text-ink shadow-gold"
                  : "border border-black/10 text-zinc-700 hover:border-gold/40"
              }`}
              data-testid={`lib-filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      <LibraryContent
        loading={loadingSaved}
        items={filtered}
        onToggleFavorite={toggleFavorite}
        onExport={setExportPalette}
        onDelete={deletePalette}
      />

      <ExportModal
        palette={exportPalette}
        captureRef={captureRef}
        open={!!exportPalette}
        onClose={() => setExportPalette(null)}
      />
    </div>
  );
}

function LibraryContent({ loading, items, onToggleFavorite, onExport, onDelete }) {
  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Carregando…</div>;
  }
  if (items.length === 0) {
    return <LibraryEmpty />;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {items.map((p, i) => (
          <LibraryCard
            key={p.id}
            palette={p}
            index={i}
            onToggleFavorite={onToggleFavorite}
            onExport={onExport}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
