import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PRESET_PALETTES, PALETTE_BACKDROPS } from "@/data/palettes";
import { isDark } from "@/utils/color";
import { Flame } from "lucide-react";

export default function TrendingPalettes() {
  const featured = PRESET_PALETTES.slice(0, 3);

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
        {featured.map((p) => {
          const backdrop = PALETTE_BACKDROPS[p.id];
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
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <Link
                to="/studio"
                state={{ paletteId: p.id }}
                className="group block bg-ink-surface rounded-sm overflow-hidden border border-black/[0.06] hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
                data-testid={`trending-card-${p.id}`}
              >
                {/* Atmospheric backdrop — gerado das próprias cores da paleta */}
                <div className="relative h-44 overflow-hidden">
                  <div
                    aria-label={p.name}
                    style={backdrop}
                    className="absolute inset-0 w-full h-full transition-transform duration-1000 group-hover:scale-110"
                    data-testid={`trending-photo-${p.id}`}
                  />
                  {/* Cristalline texture overlay para feel "resina premium" */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-50 mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 9px), repeating-linear-gradient(-30deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 7px)",
                    }}
                  />
                  {/* Subtle dark gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  {/* Badge EXEMPLO — conteúdo curado de demonstração */}
                  <span
                    className="absolute top-3 left-3 text-[9px] tracking-[0.22em] uppercase font-semibold px-2 py-1 rounded-sm backdrop-blur-sm border border-white/30"
                    style={{ background: "rgba(212, 175, 55, 0.85)", color: "#FFFFFF", textShadow: "0 1px 1px rgba(0,0,0,0.25)" }}
                    data-testid={`exemplo-badge-${p.id}`}
                  >
                    Exemplo
                  </span>
                  {/* Style badge */}
                  <div className="absolute top-3 right-3 text-[9px] tracking-[0.22em] uppercase px-2 py-1 bg-white/85 backdrop-blur-sm text-ink-text rounded-sm">
                    {p.style}
                  </div>
                  {/* Color swatches strip overlay */}
                  <div className="absolute inset-x-0 bottom-0 flex h-10">
                    {p.colors.map((c) => (
                      <div
                        key={`${p.id}-${c.hex}-${c.role}`}
                        style={{ background: c.hex }}
                        className="flex-1 relative transition-all duration-500 group-hover:flex-[1.2]"
                      >
                        <span
                          className={`absolute inset-x-0 bottom-1 text-center text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDark(c.hex) ? "text-white" : "text-black"
                          }`}
                        >
                          {c.hex.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-display text-lg leading-tight">{p.name}</div>
                  <div className="text-xs text-zinc-600">{p.description}</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
