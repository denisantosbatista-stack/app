import { motion } from "framer-motion";
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react";
import { PRESET_PALETTES } from "@/data/palettes";

const SEGMENT_GREETINGS = {
  hobby: "Vamos transformar seu hobby em peças marcantes",
  iniciante: "O atelier perfeito para dar seus primeiros passos",
  profissional: "Ferramentas de estúdio à altura do seu trabalho",
  empreendedor: "Acelere sua produção e venda mais",
};

export default function WelcomeStep({ data, onFinish, onShowTour }) {
  const palette = PRESET_PALETTES.find((p) => p.id === data.paletteId) || PRESET_PALETTES[0];
  const greeting = SEGMENT_GREETINGS[data.segment] || "Tudo pronto para você criar";
  const firstName = data?.name?.split(" ")[0] || "artista";

  return (
    <div className="text-center" data-testid="onboarding-welcome">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-20 h-20 mx-auto mb-7 rounded-sm border border-gold/40 bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(184,149,74,0.28)]"
      >
        <Sparkles className="w-8 h-8 text-gold" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3"
      >
        Tudo pronto · Passo 5 de 5
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="font-display text-4xl md:text-6xl leading-[0.95] tracking-tight text-ink-text mb-5"
      >
        Bem-vindo,{" "}
        <span className="italic gold-shimmer capitalize">{firstName}</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-ink-muted text-base md:text-lg max-w-md mx-auto leading-relaxed"
      >
        {greeting}.
      </motion.p>

      {/* Mini-resumo do que foi configurado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="max-w-md mx-auto mt-8 glass rounded-sm p-5 text-left"
      >
        <div className="label-eyebrow mb-3">Seu kit inicial</div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-muted">Perfil</span>
            <span className="text-ink-text font-medium capitalize" data-testid="welcome-summary-segment">
              {data.segment}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-muted">Paleta inicial</span>
            <span className="flex items-center gap-2">
              <span className="flex rounded-sm overflow-hidden border border-black/[0.06]">
                {palette.colors.map((c, i) => (
                  <span key={i} className="w-4 h-4" style={{ background: c.hex }} />
                ))}
              </span>
              <span className="text-ink-text font-medium" data-testid="welcome-summary-palette">
                {palette.name}
              </span>
            </span>
          </div>
          {data.email && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">E-mail</span>
              <span
                className="text-ink-text font-medium truncate max-w-[60%]"
                data-testid="welcome-summary-email"
              >
                {data.email}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="flex items-center justify-center gap-3 mt-10 flex-wrap"
      >
        <button
          onClick={onShowTour}
          data-testid="onboarding-welcome-tour"
          className="btn-outline-gold px-6 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Ver tour guiado
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFinish}
          data-testid="onboarding-welcome-finish"
          className="btn-gold px-10 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
        >
          Abrir Studio
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </motion.div>
    </div>
  );
}
