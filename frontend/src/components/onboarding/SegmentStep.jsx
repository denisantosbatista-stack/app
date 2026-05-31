import { motion } from "framer-motion";
import { Heart, Sprout, Briefcase, TrendingUp, ArrowRight } from "lucide-react";

const SEGMENTS = [
  {
    id: "hobby",
    icon: Heart,
    label: "Hobby",
    description: "Faço por prazer, presentes ou para mim",
    accent: "from-rose-200/60 to-rose-100/20",
  },
  {
    id: "iniciante",
    icon: Sprout,
    label: "Iniciante",
    description: "Estou começando a explorar resina epóxi",
    accent: "from-emerald-200/60 to-emerald-100/20",
  },
  {
    id: "profissional",
    icon: Briefcase,
    label: "Profissional",
    description: "Ateliê estabelecido, peças sob encomenda",
    accent: "from-amber-200/60 to-amber-100/20",
  },
  {
    id: "empreendedor",
    icon: TrendingUp,
    label: "Empreendedor",
    description: "Vendo em Etsy, Instagram, marketplace",
    accent: "from-violet-200/60 to-violet-100/20",
  },
];

export default function SegmentStep({ value, onChange, onNext }) {
  return (
    <div data-testid="onboarding-segment">
      <div className="text-center mb-10">
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3">
          Passo 1 de 5
        </div>
        <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-tight text-ink-text">
          Como você se{" "}
          <span className="italic gold-shimmer">identifica</span>?
        </h2>
        <p className="text-ink-muted mt-4 max-w-md mx-auto">
          Vamos personalizar sua experiência conforme seu perfil de artista.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {SEGMENTS.map((s, i) => {
          const Icon = s.icon;
          const active = value === s.id;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(s.id)}
              data-testid={`onboarding-segment-${s.id}`}
              className={`relative text-left p-5 rounded-sm border transition-all overflow-hidden ${
                active
                  ? "border-gold bg-white shadow-[0_8px_32px_rgba(184,149,74,0.25)]"
                  : "border-black/[0.08] bg-white/70 hover:border-gold/40 hover:bg-white"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-0 transition-opacity duration-500 ${
                  active ? "opacity-100" : "group-hover:opacity-60"
                }`}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-sm flex items-center justify-center border transition-colors ${
                      active
                        ? "bg-gold/15 border-gold/50"
                        : "bg-ink-elevated border-black/[0.06]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${active ? "text-gold-deep" : "text-ink-muted"}`}
                    />
                  </div>
                  <div className="font-display text-2xl text-ink-text">{s.label}</div>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{s.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center mt-10">
        <motion.button
          whileHover={{ scale: value ? 1.03 : 1 }}
          whileTap={{ scale: value ? 0.98 : 1 }}
          onClick={onNext}
          disabled={!value}
          data-testid="onboarding-segment-next"
          className={`btn-gold px-10 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2 ${
            !value && "opacity-40 cursor-not-allowed"
          }`}
        >
          Continuar
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
}
