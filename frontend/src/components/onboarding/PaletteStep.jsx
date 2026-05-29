import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { PRESET_PALETTES } from "@/data/palettes";

// 6 paletas curadas para o onboarding (variedade boa)
const CURATED_IDS = [
  "geodo-imperial",
  "rose-suave",
  "oceano-profundo",
  "menta-pastel",
  "ambar-luxo",
  "lavanda-bruma",
];

export default function PaletteStep({ value, onChange, onNext, onBack }) {
  const curated = CURATED_IDS.map((id) => PRESET_PALETTES.find((p) => p.id === id)).filter(Boolean);

  return (
    <div data-testid="onboarding-palette">
      <div className="text-center mb-10">
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3">
          Passo 2 de 5
        </div>
        <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-tight text-ink-text">
          Qual{" "}
          <span className="italic gold-shimmer">paleta</span>{" "}
          fala com você?
        </h2>
        <p className="text-ink-muted mt-4 max-w-md mx-auto">
          Escolha uma paleta para começar — depois você pode gerar infinitas com IA.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {curated.map((p, i) => {
          const active = value === p.id;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.5 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(p.id)}
              data-testid={`onboarding-palette-${p.id}`}
              className={`relative text-left rounded-sm border transition-all overflow-hidden ${
                active
                  ? "border-gold shadow-[0_8px_32px_rgba(184,149,74,0.28)]"
                  : "border-black/[0.08] hover:border-gold/40"
              }`}
            >
              {/* Paleta visual */}
              <div className="h-24 flex">
                {p.colors.map((c, idx) => (
                  <div key={idx} className="flex-1" style={{ background: c.hex }} />
                ))}
              </div>
              <div className="p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-base text-ink-text truncate">{p.name}</div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="text-[10px] tracking-[0.22em] uppercase text-ink-muted mt-1 truncate">
                  {p.style} · {p.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-10">
        <button
          onClick={onBack}
          data-testid="onboarding-palette-back"
          className="btn-outline-gold px-6 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
        <motion.button
          whileHover={{ scale: value ? 1.03 : 1 }}
          whileTap={{ scale: value ? 0.98 : 1 }}
          onClick={onNext}
          disabled={!value}
          data-testid="onboarding-palette-next"
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
