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

      <div className="relative max-w-md mx-auto aspect-square">
        {/* Sombra no chão */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[78%] h-6 rounded-full bg-black/30 blur-xl opacity-50" />

        {/* Geodo circular com veios dourados e profundidade */}
        <div
          className="absolute inset-2 rounded-full overflow-hidden border border-black/10 shadow-[inset_0_8px_24px_rgba(255,255,255,0.18),inset_0_-12px_36px_rgba(0,0,0,0.45),0_24px_60px_rgba(60,50,30,0.28)]"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${detail} 0%, ${main} 28%, ${accent} 62%, ${vein} 100%)`,
          }}
        >
          {/* Camada de minerais cristalinos */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <radialGradient id="ob-crystal-core" cx="35%" cy="32%" r="55%">
                <stop offset="0%" stopColor={detail} stopOpacity="0.9" />
                <stop offset="55%" stopColor={main} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ob-vein-gold" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                <stop offset="50%" stopColor="#F5D27A" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#8B6F2F" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ob-vein-soft" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor={vein} stopOpacity="0" />
                <stop offset="50%" stopColor={vein} stopOpacity="0.8" />
                <stop offset="100%" stopColor={vein} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Núcleo cristalino */}
            <ellipse cx="35" cy="32" rx="28" ry="20" fill="url(#ob-crystal-core)" />

            {/* Veios dourados animados */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
              d="M5,72 C28,38 58,82 95,28"
              stroke="url(#ob-vein-gold)"
              strokeWidth="0.9"
              fill="none"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              transition={{ duration: 2.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              d="M12,18 C42,52 68,22 92,78"
              stroke="url(#ob-vein-gold)"
              strokeWidth="0.55"
              fill="none"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 2.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              d="M2,42 C24,28 52,58 72,38 C82,30 92,48 98,55"
              stroke="url(#ob-vein-soft)"
              strokeWidth="0.4"
              fill="none"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              d="M20,90 C38,62 62,72 88,55"
              stroke="url(#ob-vein-gold)"
              strokeWidth="0.35"
              fill="none"
            />

            {/* Pontos brilhantes (cristais) */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              <circle cx="28" cy="38" r="0.6" fill="#FFF6D9" />
              <circle cx="62" cy="48" r="0.4" fill="#FFF6D9" />
              <circle cx="48" cy="72" r="0.5" fill="#FFF6D9" />
              <circle cx="75" cy="30" r="0.35" fill="#FFF6D9" />
              <circle cx="22" cy="60" r="0.3" fill="#FFF6D9" />
            </motion.g>
          </svg>

          {/* Highlight superior (reflexo de verniz) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 35% at 38% 18%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 70%)",
            }}
          />

          {/* Shimmer animado */}
          <motion.div
            initial={{ x: "-120%" }}
            animate={{ x: "120%" }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
            className="absolute inset-y-0 w-1/2 pointer-events-none"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
            }}
          />
        </div>

        {/* Loader overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-2 rounded-full bg-white/55 backdrop-blur-[3px] flex items-center justify-center"
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
