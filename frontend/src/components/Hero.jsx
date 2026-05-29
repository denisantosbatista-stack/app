import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { HERO_BG, PRESET_PALETTES } from "@/data/palettes";
import ResinVisualizer from "@/components/ResinVisualizer";
import { ArrowRight, Calculator as CalcIcon, Sparkles } from "lucide-react";

const STATS = [
  { v: "12+", l: "Paletas premium" },
  { v: "10", l: "Estilos artísticos" },
  { v: "∞", l: "Combinações IA" },
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: `p-${i}`,
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  duration: 4 + (i % 3),
  delay: i * 0.3,
}));

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const showcase = PRESET_PALETTES[1];

  return (
    <section
      ref={ref}
      className="relative min-h-[88vh] md:min-h-[92vh] flex items-center overflow-hidden noise text-white"
      data-testid="hero-section"
    >
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover object-center scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#F4EFE6]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </motion.div>

      <div className="absolute inset-0 z-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-gold-hover/80"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-32 md:py-20 grid md:grid-cols-12 gap-10 items-center w-full">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { delayChildren: 0.15, staggerChildren: 0.14 } },
          }}
          className="md:col-span-7"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
            }}
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-gold-hover/40 bg-black/30 backdrop-blur-md"
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Sparkles className="w-3 h-3 text-gold-hover" />
            </motion.span>
            <span className="text-[11px] tracking-[0.32em] uppercase font-semibold text-gold-hover">
              Studio Visual de Cores para Resina
            </span>
          </motion.div>

          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 28, filter: "blur(12px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="font-display font-light text-[2rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl sm:leading-[1.05] tracking-tight mb-5 md:mb-6 text-white"
          >
            Transforme cores em
            <br />
            <span className="italic gold-shimmer">arte com resina</span>
          </motion.h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="text-zinc-200 text-sm md:text-lg max-w-xl leading-relaxed mb-7 md:mb-8"
          >
            Visualize paletas em peças reais, gere combinações com IA, calcule
            proporções com precisão e exporte em qualquer formato — tudo em um
            só atelier digital.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
              <Link
                to="/studio"
                className="btn-gold px-6 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2"
                data-testid="hero-cta-studio"
              >
                ✦ Criar paleta com IA
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
              <Link
                to="/calculator"
                className="px-6 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 border border-gold-hover/50 text-gold-hover bg-black/30 backdrop-blur-md hover:bg-black/40 transition-colors duration-500"
                data-testid="hero-cta-calc"
              >
                <CalcIcon className="w-4 h-4" />
                Calcular proporções
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { delayChildren: 0.95, staggerChildren: 0.14 } },
            }}
            className="mt-10 md:mt-12 grid grid-cols-3 gap-3 md:gap-6 max-w-md"
            data-testid="hero-stats"
          >
            {STATS.map((s) => (
              <motion.div
                key={s.l}
                variants={{
                  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={{ x: 4, scale: 1.04 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className="border-l border-gold-hover/40 pl-3 cursor-default"
              >
                <div className="font-display text-2xl md:text-3xl gold-text">{s.v}</div>
                <div className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-zinc-300 mt-1 leading-tight">
                  {s.l}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, x: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.5, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-5 relative hidden md:flex justify-center"
        >
          <motion.div
            className="relative animate-floaty"
            whileHover={{ scale: 1.03, rotate: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            <motion.div
              animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gold-hover/20 blur-[80px] rounded-full"
            />
            <div className="relative rounded-sm overflow-hidden shadow-gold-lg gradient-border-gold p-1">
              <ResinVisualizer palette={showcase} size={420} animated intensity={1.2} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-sm text-center min-w-[180px]"
            >
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-300">Em destaque</div>
              <div className="font-display text-base gold-shimmer">{showcase.name}</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-zinc-300">
        <span className="text-[10px] tracking-[0.3em] uppercase">scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-gold-hover to-transparent"
        />
      </div>
    </section>
  );
}
