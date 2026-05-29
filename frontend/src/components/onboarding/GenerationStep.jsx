import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { PRESET_PALETTES } from "@/data/palettes";

// Frases motivacionais curtas (ciclam durante o "carregamento")
const PHRASES = [
  "Selecionando pigmentos…",
  "Calibrando veios dourados…",
  "Equilibrando harmonia cromática…",
  "Finalizando sua primeira peça…",
];

export default function GenerationStep({ paletteId, onNext, onBack }) {
  const palette = PRESET_PALETTES.find((p) => p.id === paletteId) || PRESET_PALETTES[0];
  const [loading, setLoading] = useState(true);
  const [phraseIdx, setPhraseIdx] = useState(0);

  // Simula geração da primeira peça (visual local, sem call de API)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 700);
    return () => clearInterval(iv);
  }, [loading]);

  const [main, accent, detail, vein] = palette.colors.map((c) => c.hex);

  return (
    <div data-testid="onboarding-generation">
      <div className="text-center mb-8">
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3">
          Passo 3 de 5
        </div>
        <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-tight text-ink-text">
          Sua primeira{" "}
          <span className="italic gold-shimmer">peça</span>
        </h2>
        <p className="text-ink-muted mt-4 max-w-md mx-auto">
          Criamos uma prévia da paleta <strong className="text-ink-text">{palette.name}</strong>{" "}
          aplicada num geodo.
        </p>
      </div>

      <div className="relative max-w-md mx-auto aspect-square rounded-sm overflow-hidden border border-black/[0.08] shadow-[0_12px_48px_rgba(60,50,30,0.12)]">
        {/* Fundo gradiente da paleta */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${detail} 0%, ${main} 35%, ${accent} 70%, ${vein} 100%)`,
          }}
        />
        {/* Veios dourados */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ob-vein" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor={vein} stopOpacity="0.0" />
              <stop offset="50%" stopColor={vein} stopOpacity="0.85" />
              <stop offset="100%" stopColor={vein} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
            d="M5,80 C30,40 70,90 95,30"
            stroke="url(#ob-vein)"
            strokeWidth="0.7"
            fill="none"
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            d="M10,15 C40,55 65,20 90,75"
            stroke="url(#ob-vein)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>

        {/* Glow shimmer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent"
        />

        {/* Loader overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-white/55 backdrop-blur-[3px] flex items-center justify-center"
              data-testid="onboarding-generation-loader"
            >
              <div className="text-center px-6">
                <Loader2 className="w-7 h-7 text-gold animate-spin mx-auto mb-3" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phraseIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="text-[11px] tracking-[0.22em] uppercase text-ink-muted"
                  >
                    {PHRASES[phraseIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Faixa da paleta abaixo */}
      <div className="max-w-md mx-auto mt-5 rounded-sm overflow-hidden border border-black/[0.08]">
        <div className="h-10 flex">
          {palette.colors.map((c, i) => (
            <div
              key={i}
              className="flex-1 flex items-end justify-center pb-1"
              style={{ background: c.hex }}
            >
              <span
                className="text-[8px] tracking-[0.18em] uppercase font-mono"
                style={{
                  color: parseInt(c.hex.slice(1), 16) > 0x888888 ? "#141414" : "#ffffff",
                }}
              >
                {c.hex}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-10">
        <button
          onClick={onBack}
          data-testid="onboarding-generation-back"
          className="btn-outline-gold px-6 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
        <motion.button
          whileHover={{ scale: loading ? 1 : 1.03 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={onNext}
          disabled={loading}
          data-testid="onboarding-generation-next"
          className={`btn-gold px-10 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
        >
          {loading ? "Gerando…" : "Salvar minha peça"}
          {!loading && <Sparkles className="w-3.5 h-3.5" />}
          {!loading && <ArrowRight className="w-3.5 h-3.5" />}
        </motion.button>
      </div>
    </div>
  );
}
