import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";

const SUGGESTIONS = [
  "Oceano cristalino luxuoso",
  "Pôr do sol em mármore preto e dourado",
  "Floresta encantada com névoa lilás",
  "Geodo de ametista profunda",
  "Aurora boreal pastel",
  "Champagne com pétalas de rosa",
];

export default function AIGenerator({ onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const generateWithAI = usePaletteStore((s) => s.generateWithAI);
  const aiGenerating = usePaletteStore((s) => s.aiGenerating);

  const handleGenerate = async (text) => {
    const q = (text || prompt).trim();
    if (!q) {
      toast.error("Descreva a paleta desejada");
      return;
    }
    const id = toast.loading("Criando paleta…", { icon: "✨" });
    try {
      const result = await generateWithAI(q);
      toast.success(`"${result.name}" gerada`, { id });
      onGenerated?.(result);
    } catch (err) {
      toast.error("Erro ao gerar paleta", { id });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative glass rounded-sm p-6 md:p-8 overflow-hidden"
      data-testid="ai-generator"
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
        <p className="text-zinc-400 text-sm mb-5 max-w-lg">
          Escreva um sentimento, paisagem ou conceito. Nossa IA gera a paleta perfeita
          com hierarquia de cores pensada para resina epóxi.
        </p>

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
            disabled={aiGenerating}
            className="btn-gold px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="ai-generate-btn"
          >
            {aiGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {aiGenerating ? "Gerando" : "Gerar paleta"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setPrompt(s);
                handleGenerate(s);
              }}
              className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-zinc-300 hover:border-gold/50 hover:text-white transition-colors"
              data-testid={`ai-suggestion-${s.slice(0, 12)}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
