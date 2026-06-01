import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard, isDark } from "@/utils/color";

// Mapeamento de categorias visuais: cores + label EM CAIXA ALTA
const CATEGORY_STYLES = {
  geodo:       { label: "GEODO",       cls: "bg-gold/25 text-[#7d5a16] border-gold/50" },
  floral:      { label: "FLORAL",      cls: "bg-rose-100 text-rose-700 border-rose-300/70" },
  pastel:      { label: "PASTEL",      cls: "bg-purple-100 text-purple-700 border-purple-300/70" },
  luxo:        { label: "LUXO",        cls: "bg-zinc-900 text-bone border-zinc-700" },
  minimalista: { label: "MINIMALISTA", cls: "bg-zinc-200 text-zinc-700 border-zinc-400/70" },
  oceano:      { label: "OCEANO",      cls: "bg-sky-100 text-sky-800 border-sky-300/70" },
  marmore:     { label: "MÁRMORE",     cls: "bg-stone-200 text-stone-800 border-stone-400/70" },
  galaxia:     { label: "GALÁXIA",     cls: "bg-indigo-900 text-bone border-indigo-700" },
};

// "Popularidade" estável derivada do id (visual social proof)
function popularityFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 80 + (h % 420);
}

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

  const category = CATEGORY_STYLES[palette.style] || CATEGORY_STYLES.minimalista;
  const popularity = popularityFor(palette.id);

  // SEMPRE exatamente 4 chips uniformes
  const chips = palette.colors.slice(0, 4);
  while (chips.length < 4) chips.push({ hex: "#F5F5F5", role: `slot-${chips.length}`, name: "" });

  const isRose = palette.id === "rose-suave";
  const isWhite = palette.id === "branco-cristal";

  // Card base: borda dourada + sombra suave + fundo neutro
  const cardStyle = {
    border: "1px solid #E8C570",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(212,178,96,0.10)",
    background: "#FCFAF6",
  };
  // Rosé Suave: borda neutra fina (não dourada) — destaca tom rosa
  if (isRose) {
    cardStyle.border = "1px solid rgba(0,0,0,0.08)";
    cardStyle.boxShadow = "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(200,160,168,0.18)";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      style={cardStyle}
      className={`palette-card group text-left relative overflow-hidden rounded-sm transition-all duration-500 ${
        active ? "ring-2 ring-gold shadow-gold" : ""
      }`}
      data-testid={`palette-card-${palette.id}`}
    >
      {/* Faixa de cores — sempre 4 chips uniformes */}
      <div className="flex h-20 relative">
        {chips.map((c, idx) => (
          <div
            key={`${palette.id}-${c.hex}-${idx}`}
            onClick={(e) => handleCopyHex(e, c.hex)}
            className="flex-1 relative cursor-copy transition-all duration-300 hover:flex-[1.4] group/swatch border-r border-black/[0.05] last:border-r-0"
            style={{ backgroundColor: c.hex }}
            data-testid={`swatch-${palette.id}-${c.role}`}
          >
            {/* Fallback elegante para Branco Cristal: textura cristalina sutil */}
            {isWhite && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(212,178,96,0.10), transparent 60%), repeating-linear-gradient(45deg, rgba(0,0,0,0.025) 0 2px, transparent 2px 8px)",
                }}
              />
            )}
            <span
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover/swatch:opacity-100 transition-opacity ${
                isDark(c.hex) ? "text-ink-text" : "text-black"
              }`}
            >
              {c.hex.toUpperCase()}
            </span>
          </div>
        ))}

        {/* Badge de categoria (caixa alta, contraste forte) */}
        <span
          className={`absolute top-2 left-2 inline-flex items-center text-[9px] tracking-[0.22em] uppercase font-semibold px-2 py-0.5 rounded-sm border backdrop-blur-sm ${category.cls}`}
          data-testid={`palette-category-${palette.id}`}
        >
          {category.label}
        </span>

        {/* Watermark LindArt ® */}
        <span
          aria-hidden
          className="watermark absolute bottom-1 right-2 text-[9px] tracking-[0.30em] uppercase font-display select-none pointer-events-none"
          style={{
            color: "rgba(255,255,255,0.65)",
            textShadow: "0 0 6px rgba(0,0,0,0.35), 0 1px 0 rgba(0,0,0,0.15)",
            mixBlendMode: "overlay",
          }}
        >
          LindArt ®
        </span>
      </div>

      {/* Conteúdo inferior */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base leading-tight truncate uppercase tracking-wide">
            {palette.name}
          </div>
          <div className="text-[11px] text-zinc-600 truncate">{palette.description}</div>
          <div
            className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-500"
            data-testid={`palette-popularity-${palette.id}`}
          >
              <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
            <span className="font-mono text-zinc-700">{popularity}</span>
            <span className="tracking-[0.18em] uppercase opacity-70">saves</span>
          </div>
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
