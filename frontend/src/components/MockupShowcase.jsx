import { motion } from "framer-motion";
import { MOCKUPS } from "@/data/palettes";

export default function MockupShowcase() {
  return (
    <section className="py-12 md:py-20 px-6 md:px-10 max-w-7xl mx-auto" data-testid="mockup-showcase">
      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <div className="label-eyebrow text-gold mb-3">Inspiração real</div>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-[1.05]">
            Peças que <span className="italic gold-shimmer">encantam</span>
          </h2>
          <p className="text-zinc-600 mt-3 max-w-lg">
            Visualize como suas paletas podem renascer em peças tangíveis — desde
            relógios estatement até bandejas de mármore dourado.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
        }}
        className="grid md:grid-cols-3 gap-6"
      >
        {MOCKUPS.map((m) => (
          <motion.div
            key={m.id}
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.94, filter: "blur(10px)" },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            whileHover={{ y: -10, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="group relative overflow-hidden rounded-sm aspect-[4/5] cursor-pointer shadow-lg hover:shadow-gold-lg transition-shadow duration-700"
            data-testid={`mockup-${m.id}`}
          >
            <img
              src={m.url}
              alt={m.label}
              className="w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #C9A96E, #2A2A2A)";
                e.currentTarget.removeAttribute("src");
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.32em] uppercase text-gold mb-1">
                  Premium
                </div>
                <div className="font-display text-2xl">{m.label}</div>
              </div>
              <motion.div
                whileHover={{ rotate: -8, scale: 1.12 }}
                transition={{ type: "spring", stiffness: 360, damping: 14 }}
                className="w-9 h-9 rounded-full glass-strong flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-colors duration-500"
              >
                →
              </motion.div>
            </div>
            <div className="absolute inset-0 border border-transparent group-hover:border-gold/40 transition-colors duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
