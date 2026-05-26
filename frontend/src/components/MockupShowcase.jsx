import { motion } from "framer-motion";
import { MOCKUPS } from "@/data/palettes";

export default function MockupShowcase() {
  return (
    <section className="py-20 px-6 md:px-10 max-w-7xl mx-auto" data-testid="mockup-showcase">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <div className="label-eyebrow text-gold mb-3">Inspiração real</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight leading-none">
            Peças que <span className="italic gold-shimmer">encantam</span>
          </h2>
          <p className="text-zinc-400 mt-3 max-w-lg">
            Visualize como suas paletas podem renascer em peças tangíveis — desde
            relógios estatement até bandejas de mármore dourado.
          </p>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {MOCKUPS.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-sm aspect-[4/5] cursor-pointer"
            data-testid={`mockup-${m.id}`}
          >
            <img
              src={m.url}
              alt={m.label}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.32em] uppercase text-gold mb-1">
                  Premium
                </div>
                <div className="font-display text-2xl">{m.label}</div>
              </div>
              <div className="w-9 h-9 rounded-full glass-strong flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-all duration-500">
                →
              </div>
            </div>
            <div className="absolute inset-0 border border-transparent group-hover:border-gold/40 transition-colors duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
