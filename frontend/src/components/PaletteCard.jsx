import { motion } from "framer-motion";
import { Copy, Heart, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard, isDark } from "@/utils/color";

export default function PaletteCard({ palette, active, onClick, onFavorite, favorite, index = 0 }) {
  const handleCopyHex = (e, hex) => {
    e.stopPropagation();
    copyToClipboard(hex);
    toast.success(`${hex} copiado`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/studio?p=${palette.id}`;
    copyToClipboard(url);
    toast.success("Link copiado para compartilhar");
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`group text-left relative overflow-hidden rounded-sm transition-all duration-500
        ${active
          ? "ring-1 ring-gold shadow-gold bg-ink-elevated"
          : "ring-1 ring-black/[0.06] bg-ink-surface hover:ring-black/20"
        }`}
      data-testid={`palette-card-${palette.id}`}
    >
      <div className="flex h-20">
        {palette.colors.map((c) => (
          <div
            key={`${palette.id}-${c.hex}-${c.role}`}
            onClick={(e) => handleCopyHex(e, c.hex)}
            className="flex-1 relative cursor-copy transition-all duration-300 hover:flex-[1.4] group/swatch"
            style={{ backgroundColor: c.hex }}
            data-testid={`swatch-${palette.id}-${c.role}`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover/swatch:opacity-100 transition-opacity ${
                isDark(c.hex) ? "text-ink-text" : "text-black"
              }`}
            >
              {c.hex.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base leading-tight truncate">{palette.name}</div>
          <div className="text-[11px] text-zinc-600 truncate">{palette.description}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onFavorite && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onFavorite(palette);
              }}
              className={`p-1 rounded-sm transition-colors ${
                favorite ? "text-gold" : "text-zinc-500 hover:text-ink-text"
              }`}
              data-testid={`fav-btn-${palette.id}`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorite ? "fill-current" : ""}`} />
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={handleShare}
            className="p-1 rounded-sm text-zinc-500 hover:text-ink-text"
            data-testid={`share-btn-${palette.id}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
      {active && (
        <motion.div
          layoutId="active-palette-indicator"
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold shadow-gold animate-pulseGold"
        />
      )}
    </motion.button>
  );
}
