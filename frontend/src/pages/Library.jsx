import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Heart, Trash2, Download, Sparkles, Inbox, Filter } from "lucide-react";
import { usePaletteStore } from "@/store/usePaletteStore";
import { isDark } from "@/utils/color";
import ExportModal from "@/components/ExportModal";
import { useRef } from "react";

export default function Library() {
  const { saved, loadingSaved, toggleFavorite, deletePalette } = usePaletteStore();
  const [filter, setFilter] = useState("todos"); // todos | favoritos | ai | user
  const [exportPalette, setExportPalette] = useState(null);
  const captureRef = useRef(null);

  const filtered = useMemo(() => {
    if (filter === "favoritos") return saved.filter((p) => p.favorite);
    if (filter === "ai") return saved.filter((p) => p.source === "ai");
    if (filter === "user") return saved.filter((p) => p.source === "user");
    return saved;
  }, [saved, filter]);

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
          <p className="text-zinc-400 mt-3 max-w-xl">
            Paletas favoritas, criações pessoais e descobertas da IA — tudo sincronizado.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "todos", label: "Todas" },
            { id: "favoritos", label: "★ Favoritas" },
            { id: "ai", label: "IA" },
            { id: "user", label: "Minhas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] transition-all ${
                filter === f.id
                  ? "bg-gold text-ink shadow-gold"
                  : "border border-white/10 text-zinc-300 hover:border-gold/40"
              }`}
              data-testid={`lib-filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loadingSaved ? (
        <div className="text-center py-20 text-zinc-500">Carregando…</div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-sm p-12 text-center"
        >
          <Inbox className="w-10 h-10 text-gold/60 mx-auto mb-4" />
          <h3 className="font-display text-2xl mb-2">Sua biblioteca está vazia</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            Crie ou gere paletas com IA, depois salve-as aqui para acessar a qualquer momento.
          </p>
          <Link
            to="/studio"
            className="btn-gold px-5 py-2.5 rounded-sm text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2"
            data-testid="lib-empty-cta"
          >
            <Sparkles className="w-4 h-4" />
            Ir para o Studio
          </Link>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className="group bg-ink-surface rounded-sm overflow-hidden border border-white/[0.06] hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
                data-testid={`library-card-${p.id}`}
              >
                <div className="flex h-28">
                  {p.colors.map((c, j) => (
                    <div key={j} style={{ background: c.hex }} className="flex-1" />
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-display text-lg leading-tight truncate">{p.name}</div>
                      <div className="text-xs text-zinc-400 truncate">{p.description}</div>
                    </div>
                    {p.source === "ai" && (
                      <span className="text-[9px] tracking-[0.2em] uppercase text-gold border border-gold/40 px-1.5 py-0.5 rounded-sm">
                        IA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="flex gap-1 flex-wrap">
                      {(p.tags || []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] uppercase tracking-wider text-zinc-400 px-1.5 py-0.5 border border-white/10 rounded-sm"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        className={`p-1.5 rounded-sm transition-colors ${
                          p.favorite ? "text-gold" : "text-zinc-500 hover:text-white"
                        }`}
                        data-testid={`lib-fav-${p.id}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${p.favorite ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => setExportPalette(p)}
                        className="p-1.5 rounded-sm text-zinc-500 hover:text-white"
                        data-testid={`lib-export-${p.id}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          deletePalette(p.id);
                          toast.success("Paleta removida");
                        }}
                        className="p-1.5 rounded-sm text-zinc-500 hover:text-red-400"
                        data-testid={`lib-delete-${p.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ExportModal
        palette={exportPalette}
        captureRef={captureRef}
        open={!!exportPalette}
        onClose={() => setExportPalette(null)}
      />
    </div>
  );
}
