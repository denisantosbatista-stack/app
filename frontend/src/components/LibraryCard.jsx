import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Heart, Trash2, Download } from "lucide-react";

export default function LibraryCard({ palette, index, onToggleFavorite, onExport, onDelete }) {
  const handleDelete = () => {
    onDelete(palette.id);
    toast.success("Paleta removida");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className="group bg-ink-surface rounded-sm overflow-hidden border border-white/[0.06] hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
      data-testid={`library-card-${palette.id}`}
    >
      <div className="flex h-28">
        {palette.colors.map((c) => (
          <div key={`${palette.id}-${c.hex}-${c.role}`} style={{ background: c.hex }} className="flex-1" />
        ))}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight truncate">{palette.name}</div>
            <div className="text-xs text-zinc-400 truncate">{palette.description}</div>
          </div>
          {palette.source === "ai" && (
            <span className="text-[9px] tracking-[0.2em] uppercase text-gold border border-gold/40 px-1.5 py-0.5 rounded-sm">
              IA
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex gap-1 flex-wrap">
            {(palette.tags || []).slice(0, 2).map((t) => (
              <span
                key={`${palette.id}-tag-${t}`}
                className="text-[9px] uppercase tracking-wider text-zinc-400 px-1.5 py-0.5 border border-white/10 rounded-sm"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite(palette.id)}
              className={`p-1.5 rounded-sm transition-colors ${
                palette.favorite ? "text-gold" : "text-zinc-500 hover:text-white"
              }`}
              data-testid={`lib-fav-${palette.id}`}
            >
              <Heart className={`w-3.5 h-3.5 ${palette.favorite ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={() => onExport(palette)}
              className="p-1.5 rounded-sm text-zinc-500 hover:text-white"
              data-testid={`lib-export-${palette.id}`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-sm text-zinc-500 hover:text-red-400"
              data-testid={`lib-delete-${palette.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
