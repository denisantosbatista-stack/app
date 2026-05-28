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
      className="relative min-h-[92vh] flex items-center overflow-hidden noise text-white"
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-20 grid md:grid-cols-12 gap-10 items-center w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-7"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-gold-hover/40 bg-black/30 backdrop-blur-md"
          >
            <Sparkles className="w-3 h-3 text-gold-hover" />
            <span className="text-[11px] tracking-[0.32em] uppercase font-semibold text-gold-hover">
              Studio Visual de Cores para Resina
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-light text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.02] mb-6 text-white"
          >
            Transforme cores em
            <br />
            <span className="italic gold-shimmer">arte com resina epóxi</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-zinc-200 text-base md:text-lg max-w-xl leading-relaxed mb-8"
          >
            Visualize paletas em peças reais, gere combinações com IA, calcule
            proporções com precisão e exporte em qualquer formato — tudo em um
            só atelier digital.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              to="/studio"
              className="btn-gold px-6 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2"
              data-testid="hero-cta-studio"
            >
              ✦ Criar paleta com IA
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/calculator"
              className="px-6 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 border border-gold-hover/50 text-gold-hover bg-black/30 backdrop-blur-md hover:bg-black/40 transition"
              data-testid="hero-cta-calc"
            >
              <CalcIcon className="w-4 h-4" />
              Calcular proporções
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-12 grid grid-cols-3 gap-6 max-w-md"
          >
            {STATS.map((s) => (
              <div key={s.l} className="border-l border-gold-hover/40 pl-3">
                <div className="font-display text-3xl gold-text">{s.v}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-300 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-5 relative hidden md:flex justify-center"
        >
          <div className="relative animate-floaty">
            <div className="absolute inset-0 bg-gold-hover/20 blur-[80px] rounded-full" />
            <div className="relative rounded-sm overflow-hidden shadow-gold-lg gradient-border-gold p-1">
              <ResinVisualizer palette={showcase} size={420} animated intensity={1.2} />
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-sm text-center min-w-[180px]">
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-300">Em destaque</div>
              <div className="font-display text-base gold-shimmer">{showcase.name}</div>
            </div>
          </div>
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
