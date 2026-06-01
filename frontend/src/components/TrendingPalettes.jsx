import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { PRESET_PALETTES, PALETTE_BACKDROPS } from "@/data/palettes";
import { Flame } from "lucide-react";

// A1 — Mapeamento estrito categoria → legenda. Normalize case-insensitive + sem acentos.
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const CATEGORY_LEGENDS = {
  floral: "Ideal para bandejas florais e pingentes",
  geodo: "Perfeita para geodos e quadros decorativos",
  luxo: "Sofisticada para bandejas e relógios premium",
  pastel: "Suave para joias e porta-retratos",
  oceano: "Vibrante para mesas e fundos marinhos",
  marmore: "Elegante para bandejas e quadros statement",
  minimalista: "Clean para peças modernas e utilitários",
  galaxia: "Dramática para geodos e arte abstrata",
  metalico: "Impactante para relógios e peças statement",
  acido: "Ousada para arte abstrata e quadros",
  boho: "Orgânica para porta-joias e peças naturais",
  pave: "Delicada para joias e pingentes finos",
  foil: "Luminosa para bandejas e quadros dourados",
  holografico: "Futurista para peças colecionáveis",
  espelhado: "Reflexiva para mesas e objetos de design",
};
const FALLBACK_LEGEND = "Versátil para diversas peças de resina";

const getCategoryLegend = (style) => {
  const key = norm(style);
  // match exato ou por prefixo (ex: "pave-cristais" → "pave")
  if (CATEGORY_LEGENDS[key]) return CATEGORY_LEGENDS[key];
  const prefix = Object.keys(CATEGORY_LEGENDS).find((k) => key.startsWith(k));
  return prefix ? CATEGORY_LEGENDS[prefix] : FALLBACK_LEGEND;
};

export default function TrendingPalettes() {
  const featured = (() => {
    const top3 = PRESET_PALETTES.slice(0, 3);
    const geodoIdx = top3.findIndex((p) => p.id === "geodo-imperial");
    if (geodoIdx > 0) {
      const reordered = [...top3];
      const [geodo] = reordered.splice(geodoIdx, 1);
      reordered.unshift(geodo);
      return reordered;
    }
    if (geodoIdx === -1) {
      const fromAll = PRESET_PALETTES.find((p) => p.id === "geodo-imperial");
      if (fromAll) return [fromAll, ...top3.slice(0, 2)];
    }
    return top3;
  })();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  // A2 — Clique na paleta dispara feedback visual de 1.5s, salva em localStorage e navega.
  const handlePaletteClick = (palette) => {
    if (selectedId) return; // evita cliques duplos durante transição
    setSelectedId(palette.id);
    try {
      localStorage.setItem(
        "lindart_palette_preview",
        JSON.stringify({
          paletteId: palette.id,
          name: palette.name,
          colors: palette.colors,
          style: palette.style,
          ts: Date.now(),
        })
      );
    } catch {
      // ignora falha de storage (modo privado etc.)
    }
    setTimeout(() => {
      navigate("/studio", {
        state: { paletteId: palette.id, fromHome: true, name: palette.name },
      });
    }, 1500);
  };

  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto" data-testid="trending-palettes">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10"
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <motion.span
              animate={{ scale: [1, 1.2, 1], rotate: [0, 8, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Flame className="w-3.5 h-3.5 text-gold" />
            </motion.span>
            <span className="label-eyebrow text-gold">Em alta</span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-[1.05]">
            Paletas <span className="italic gold-shimmer">trending</span>
          </h2>
          <p className="text-zinc-600 mt-3 max-w-lg text-sm">
            Ambientações fotográficas reais inspirando cada combinação cromática.
          </p>
        </div>
        <Link
          to="/studio"
          className="group text-xs tracking-[0.22em] uppercase text-gold hover:text-gold-hover hidden md:inline-flex items-center gap-2 transition-colors duration-300"
        >
          Ver todas
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block"
          >
            →
          </motion.span>
        </Link>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {featured.map((p, idx) => {
          const backdrop = PALETTE_BACKDROPS[p.id];
          const isSelected = selectedId === p.id;
          const legend = getCategoryLegend(p.style);
          const isFeatured = idx === 0;
          return (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 28, scale: 0.96, filter: "blur(8px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              whileHover={!selectedId ? { y: -8, scale: 1.015 } : undefined}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <button
                type="button"
                onClick={() => handlePaletteClick(p)}
                disabled={!!selectedId}
                className={`group block w-full text-left bg-ink-surface rounded-sm overflow-hidden border transition-all duration-500 ${
                  isSelected
                    ? "border-gold ring-2 ring-gold/60 shadow-gold-lg scale-[1.02]"
                    : "border-black/[0.06] hover:border-gold/40 hover:shadow-gold"
                } ${selectedId && !isSelected ? "opacity-50" : ""}`}
                data-testid={`trending-card-${p.id}`}
              >
                <div className="relative h-44 overflow-hidden">
                  <div
                    aria-label={p.name}
                    style={backdrop}
                    className="absolute inset-0 w-full h-full transition-transform duration-1000 group-hover:scale-110"
                    data-testid={`trending-photo-${p.id}`}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-50 mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 9px), repeating-linear-gradient(-30deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 7px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute top-3 right-3 text-[9px] tracking-[0.22em] uppercase px-2 py-1 bg-white/85 backdrop-blur-sm text-ink-text rounded-sm">
                    {p.style}
                  </div>
                  {isFeatured && (
                    <div
                      className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[9px] tracking-[0.22em] uppercase px-2.5 py-1 bg-gold text-ink rounded-sm font-semibold shadow-gold"
                      data-testid={`trending-featured-badge-${p.id}`}
                    >
                      <Flame className="w-3 h-3" />
                      Em destaque
                    </div>
                  )}
                  {/* A1 — Color swatches strip SEM exibição de hex */}
                  <div className="absolute inset-x-0 bottom-0 flex h-10">
                    {p.colors.map((c) => (
                      <div
                        key={`${p.id}-${c.hex}-${c.role}`}
                        style={{ background: c.hex }}
                        className="flex-1 relative transition-all duration-500 group-hover:flex-[1.2]"
                      />
                    ))}
                  </div>
                  {/* Feedback visual de seleção (1.5s antes de navegar) */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                      data-testid={`trending-card-selected-${p.id}`}
                    >
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="text-[10px] tracking-[0.3em] uppercase text-gold-hover font-semibold px-4 py-2 rounded-sm border border-gold/60 bg-black/60"
                      >
                        ✦ Abrindo Studio…
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-display text-lg leading-tight">{p.name}</div>
                  <div
                    className="text-xs text-zinc-600 mt-1"
                    data-testid={`trending-legend-${p.id}`}
                  >
                    {legend}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
