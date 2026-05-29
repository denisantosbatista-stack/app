import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function SplashStep({ onNext }) {
  return (
    <div className="text-center" data-testid="onboarding-splash">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="w-20 h-20 mx-auto mb-8 rounded-sm border border-gold/30 bg-white/80 backdrop-blur-md flex items-center justify-center shadow-[0_8px_32px_rgba(184,149,74,0.18)]"
      >
        <Sparkles className="w-8 h-8 text-gold" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3"
      >
        Studio Premium de Resina
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink-text mb-5"
      >
        Bem-vindo ao{" "}
        <span className="italic gold-shimmer">LindArt</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-ink-muted text-base md:text-lg max-w-md mx-auto leading-relaxed"
      >
        Vamos preparar seu atelier em <strong className="text-ink-text">menos de um minuto</strong>.
        Paletas inteligentes, peças reais e exportação profissional.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        data-testid="onboarding-splash-cta"
        className="btn-gold mt-10 px-10 py-4 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
      >
        Começar
        <Sparkles className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  );
}
