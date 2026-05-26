import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PRESET_PALETTES } from "@/data/palettes";
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
        </div>
        <Link
          to="/studio"
          className="text-xs tracking-[0.22em] uppercase text-gold hover:text-gold-hover hidden md:inline-flex items-center gap-2"
        >
          Ver todas →
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featured.map((p, i) => (
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
              className="group block bg-ink-surface rounded-sm overflow-hidden border border-white/[0.06] hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
              data-testid={`trending-card-${p.id}`}
            >
              <div className="flex h-32">
                {p.colors.map((c) => (
                  <div
                    key={`${p.id}-${c.hex}-${c.role}`}
                    style={{ background: c.hex }}
                    className="flex-1 relative transition-all duration-500 group-hover:flex-[1.2]"
                  >
                    <span
                      className={`absolute inset-x-0 bottom-2 text-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark(c.hex) ? "text-white" : "text-black"
                      }`}
                    >
                      {c.hex.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg leading-tight">{p.name}</div>
                  <div className="text-xs text-zinc-400">{p.description}</div>
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase px-2 py-1 border border-gold/30 text-gold rounded-sm">
                  {p.style}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
