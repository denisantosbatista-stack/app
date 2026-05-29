import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";
import { LOADING_PHRASES } from "@/data/loadingPhrases";
import { ApiError } from "@/utils/api";
import AIErrorState from "@/components/AIErrorState";

const SUGGESTIONS = [
  "Oceano cristalino luxuoso",
  "Pôr do sol em mármore preto e dourado",
  "Floresta encantada com névoa lilás",
  "Geodo de ametista profunda",
  "Aurora boreal pastel",
  "Champagne com pétalas de rosa",
];

// Máquina de estado: idle → loading → success | error
export default function AIGenerator({ onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [estado, setEstado] = useState("idle"); // idle | loading | success | error
  const [erro, setErro] = useState(null);
  const [ultimoPrompt, setUltimoPrompt] = useState("");
  const navigate = useNavigate();
  const generateWithAI = usePaletteStore((s) => s.generateWithAI);
  const aiGenerating = usePaletteStore((s) => s.aiGenerating);

  // Cycle motivational phrases enquanto loading.
  // O cleanup do setInterval previne vazamento ao desmontar / alternar estado.
  useEffect(() => {
    if (estado !== "loading") return;
    setPhraseIndex(Math.floor(Math.random() * LOADING_PHRASES.length));
    const t = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(t);
  }, [estado]);

  const handleGenerate = async (text) => {
    const q = (text || prompt).trim();
    if (!q) {
      toast.error("Descreva a paleta desejada");
      return;
    }
    setUltimoPrompt(q);
    setEstado("loading");
    setErro(null);
    const id = toast.loading("Criando paleta…", { icon: "✨" });
    try {
      const result = await generateWithAI(q);
      toast.success(`"${result.name}" gerada`, { id });
      setEstado("success");
      onGenerated?.(result);
    } catch (err) {
      toast.dismiss(id);
      const errObj =
        err instanceof ApiError
          ? err
          : new ApiError(err?.message || "Falha desconhecida", { tipo: "servidor" });
      setErro(errObj);
      setEstado("error");
    }
  };

  const handleRetry = () => {
    if (ultimoPrompt) handleGenerate(ultimoPrompt);
    else setEstado("idle");
  };

  const handleUpgrade = () => {
    // CTA de upgrade — leva para a página de planos (placeholder até paywall existir).
    navigate("/premium");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative glass rounded-sm p-6 md:p-8 overflow-hidden"
      data-testid="ai-generator"
      data-state={estado}
    >
      <div className="absolute -top-32 -right-32 w-72 h-72 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="label-eyebrow">Paleta IA</span>
        </div>
        <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-2">
          Descreva. <span className="gold-shimmer">A IA cria.</span>
        </h3>
        <p className="text-zinc-600 text-sm mb-5 max-w-lg">
          Escreva um sentimento, paisagem ou conceito. Nossa IA gera a paleta perfeita
          com hierarquia de cores pensada para resina epóxi.
        </p>

        {estado === "error" && erro ? (
          <AIErrorState erro={erro} onRetry={handleRetry} onUpgrade={handleUpgrade} />
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder='Ex: "oceano cristalino com toques dourados"'
                className="flex-1 text-sm"
                data-testid="ai-prompt-input"
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={estado === "loading" || aiGenerating}
                className="btn-gold px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="ai-generate-btn"
              >
                {estado === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {estado === "loading" ? "Gerando" : "Gerar paleta"}
              </button>
            </div>

            {/* Loading phrase ticker */}
            <AnimatePresence mode="wait">
              {estado === "loading" && (
                <motion.div
                  key={phraseIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 flex items-center gap-2 text-sm italic text-gold-deep"
                  data-testid="ai-loading-phrase"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulseGold" />
                  {LOADING_PHRASES[phraseIndex]}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPrompt(s);
                    handleGenerate(s);
                  }}
                  disabled={estado === "loading"}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-black/10 text-zinc-700 hover:border-gold/50 hover:text-ink-text transition-colors disabled:opacity-50"
                  data-testid={`ai-suggestion-${s.slice(0, 12)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
