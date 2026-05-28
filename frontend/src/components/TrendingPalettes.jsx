import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PRESET_PALETTES, PALETTE_PHOTOS } from "@/data/palettes";
import { isDark } from "@/utils/color";
import { Flame } from "lucide-react";

export default function TrendingPalettes() {
  const featured = PRESET_PALETTES.slice(0, 6);

  return (
    <section className="py-20 px-6 md:px-10 max-w-7xl mx-auto" data-testid="trending-palettes">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between mb-10"
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-3.5 h-3.5 text-gold" />
            <span className="label-eyebrow text-gold">Em alta</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight leading-none">
            Paletas <span className="italic gold-shimmer">trending</span>
          </h2>
          <p className="text-zinc-600 mt-3 max-w-lg text-sm">
            Ambientações fotográficas reais inspirando cada combinação cromática.
          </p>
        </div>
        <Link
          to="/studio"
          className="text-xs tracking-[0.22em] uppercase text-gold hover:text-gold-hover hidden md:inline-flex items-center gap-2"
        >
          Ver todas →
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featured.map((p, i) => {
          const photo = PALETTE_PHOTOS[p.id];
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <Link
                to="/studio"
                state={{ paletteId: p.id }}
                className="group block bg-ink-surface rounded-sm overflow-hidden border border-black/[0.06] hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
                data-testid={`trending-card-${p.id}`}
              >
                {/* Atmospheric photo backdrop */}
                <div className="relative h-44 overflow-hidden">
                  {photo && (
                    <img
                      src={photo}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      data-testid={`trending-photo-${p.id}`}
                    />
                  )}
                  {/* Subtle dark gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
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
      </div>
    </section>
  );
}
