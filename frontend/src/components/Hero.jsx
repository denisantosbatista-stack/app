import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { PRESET_PALETTES } from "@/data/palettes";
import ResinVisualizer from "@/components/ResinVisualizer";
import { ArrowRight, Sparkles, Palette, Box, Download } from "lucide-react";

// Fundo marmorizado bege claro com veios dourados — gerado puramente em CSS
// para evitar dependência de imagem e dar identidade própria ao hero.
const HERO_MARBLE_BG = {
  backgroundColor: "#EFE6D4",
  backgroundImage: [
    // Veios dourados finos diagonais (camada principal)
    "linear-gradient(115deg, transparent 0%, transparent 36%, rgba(212,175,55,0.18) 37%, rgba(212,175,55,0.55) 38.2%, rgba(212,175,55,0.18) 39.4%, transparent 40%, transparent 60%, rgba(212,175,55,0.12) 61%, rgba(212,175,55,0.42) 62%, rgba(212,175,55,0.12) 63%, transparent 64%, transparent 100%)",
    // Veio largo secundário
    "linear-gradient(68deg, transparent 0%, transparent 52%, rgba(184,134,11,0.10) 54%, rgba(184,134,11,0.30) 56%, rgba(184,134,11,0.10) 58%, transparent 60%, transparent 100%)",
    // Veio cruzado fino
    "linear-gradient(155deg, transparent 0%, transparent 70%, rgba(212,175,55,0.22) 71%, rgba(212,175,55,0.05) 72.5%, transparent 73%, transparent 100%)",
    // Manchas atmosféricas — claro e ouro
    "radial-gradient(ellipse 55% 50% at 18% 22%, rgba(255,248,228,0.85), transparent 60%)",
    "radial-gradient(ellipse 65% 55% at 82% 78%, rgba(228,210,170,0.75), transparent 65%)",
    "radial-gradient(ellipse 40% 35% at 60% 50%, rgba(245,232,200,0.55), transparent 70%)",
    // Base bege claro suave
    "linear-gradient(135deg, #F4ECDA 0%, #ECE0C6 50%, #E5D6B5 100%)",
  ].join(", "),
};

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
      className="relative min-h-[68vh] md:min-h-[74vh] flex items-center overflow-hidden noise text-zinc-900"
      data-testid="hero-section"
    >
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <div className="w-full h-full" style={HERO_MARBLE_BG} aria-hidden="true" />
        {/* Vinheta sutil para profundidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F4EFE6]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_0%,rgba(244,239,230,0.45)_100%)]" />
      </motion.div>

      <div className="absolute inset-0 z-0 pointer-events-none">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-gold/70"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -30, 0], opacity: [0.15, 0.7, 0.15] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20 md:py-14 grid md:grid-cols-12 gap-8 items-center w-full">
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
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-gold/50 bg-white/55 backdrop-blur-md shadow-sm"
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Sparkles className="w-3 h-3 text-gold" />
            </motion.span>
            <span className="text-[11px] tracking-[0.32em] uppercase font-semibold text-gold">
              Studio Visual de Cores para Resina
            </span>
          </motion.div>

          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 28, filter: "blur(12px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="font-display font-light text-[2rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl sm:leading-[1.05] tracking-tight mb-3 md:mb-4 text-zinc-900"
            data-testid="hero-h1"
          >
            Crie. Visualize. <span className="italic gold-shimmer">Exporte.</span>
          </motion.h1>

          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 22, filter: "blur(10px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="font-display font-light text-lg md:text-2xl lg:text-3xl tracking-tight text-zinc-800/90 mb-3 md:mb-4 max-w-2xl"
            data-testid="hero-h2"
          >
            Transforme cores em arte com <span className="italic text-gold">resina epóxi</span>
          </motion.h2>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="text-zinc-700 text-sm md:text-base max-w-xl leading-relaxed mb-5 md:mb-6"
            data-testid="hero-description"
          >
            Visualize paletas em peças reais, gere combinações com IA, calcule
            proporções com precisão e exporte em qualquer formato — tudo em um
            só ateliê digital.
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
                ✦ Criar minha primeira paleta
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Mini-steps — fluxo em 3 etapas (A4) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 md:mt-6 flex items-center gap-2.5 md:gap-3 overflow-x-auto no-scrollbar pr-4"
            data-testid="hero-mini-steps-wrapper"
          >
            <span
              className="shrink-0 text-[9px] md:text-[10px] tracking-[0.28em] uppercase text-gold pr-2.5 border-r border-gold/40"
              data-testid="hero-mini-steps-prefix"
            >
              Antes,
            </span>
            <motion.ol
              variants={{
                hidden: {},
                visible: { transition: { delayChildren: 0.55, staggerChildren: 0.12 } },
              }}
              initial="hidden"
              animate="visible"
              className="flex flex-nowrap items-center gap-x-2.5 md:gap-x-3 text-[9px] md:text-[10px] tracking-[0.12em] md:tracking-[0.14em] uppercase text-zinc-800 whitespace-nowrap"
              data-testid="hero-mini-steps"
            >
            {[
              { icon: Palette, label: "Escolha a paleta", testid: "hero-step-1" },
              { icon: Box, label: "Visualize na peça", testid: "hero-step-2" },
              { icon: Download, label: "Exporte em alta", testid: "hero-step-3" },
            ].map((step, idx) => (
              <motion.li
                key={step.label}
                variants={{
                  hidden: { opacity: 0, x: -10, filter: "blur(6px)" },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="flex items-center gap-1.5 md:gap-2 shrink-0"
                data-testid={step.testid}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full border border-gold/55 bg-white/65 backdrop-blur-sm text-gold shrink-0">
                  <step.icon className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={1.6} />
                </span>
                <span className="text-zinc-800">
                  <span className="text-gold mr-1">0{idx + 1}</span>
                  {step.label}
                </span>
                {idx < 2 && (
                  <span className="inline-block w-3 md:w-4 h-px bg-gradient-to-r from-gold/60 to-transparent ml-0.5 md:ml-1 shrink-0" aria-hidden="true" />
                )}
              </motion.li>
            ))}
          </motion.ol>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { delayChildren: 0.95, staggerChildren: 0.14 } },
            }}
            className="mt-7 md:mt-8 grid grid-cols-3 gap-3 md:gap-6 max-w-md"
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
                className="border-l border-gold/50 pl-3 cursor-default"
              >
                <div className="font-display text-2xl md:text-3xl gold-text">{s.v}</div>
                <div className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-zinc-700 mt-1 leading-tight">
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
              <ResinVisualizer palette={showcase} size={360} animated intensity={1.2} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 glass-strong px-4 py-2 rounded-sm text-center min-w-[180px] border border-gold/30"
            >
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-700">Em destaque</div>
              <div className="font-display text-base gold-shimmer">{showcase.name}</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-zinc-700">
        <span className="text-[10px] tracking-[0.3em] uppercase">scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-gold to-transparent"
        />
      </div>
    </section>
  );
}
