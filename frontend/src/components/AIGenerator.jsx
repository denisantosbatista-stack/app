import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2, ImagePlus, X } from "lucide-react";
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Lê um File como dataURL base64.
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

// Máquina de estado: idle → loading → success | error
export default function AIGenerator({ onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [estado, setEstado] = useState("idle"); // idle | loading | success | error
  const [erro, setErro] = useState(null);
  const [ultimoPrompt, setUltimoPrompt] = useState("");
  const [imagem, setImagem] = useState(null); // { dataUrl, base64, name }
  const [dragAtivo, setDragAtivo] = useState(false);
  const inputFileRef = useRef(null);
  const navigate = useNavigate();
  const generateWithAI = usePaletteStore((s) => s.generateWithAI);
  const aiGenerating = usePaletteStore((s) => s.aiGenerating);

  // Cycle motivational phrases enquanto loading.
  useEffect(() => {
    if (estado !== "loading") return;
    setPhraseIndex(Math.floor(Math.random() * LOADING_PHRASES.length));
    const t = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(t);
  }, [estado]);

  const handleArquivo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (JPG, PNG, WebP)");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    try {
      const dataUrl = await readFileAsBase64(file);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      setImagem({ dataUrl, base64, name: file.name });
      toast.success("Imagem pronta. Gere a paleta agora.", { icon: "🎨" });
    } catch (e) {
      toast.error(e.message || "Falha ao ler imagem");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragAtivo(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleArquivo(file);
  };

  const limparImagem = () => {
    setImagem(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  };

  const handleGenerate = async (text) => {
    const q = (text || prompt).trim();
    if (!q && !imagem) {
      toast.error("Descreva a paleta ou envie uma imagem");
      return;
    }
    setUltimoPrompt(q);
    setEstado("loading");
    setErro(null);
    const msg = imagem ? "Extraindo paleta da imagem…" : "Criando paleta…";
    const id = toast.loading(msg, { icon: "✨" });
    try {
      const result = await generateWithAI(q, undefined, imagem?.base64 || null);
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
    if (ultimoPrompt || imagem) handleGenerate(ultimoPrompt);
    else setEstado("idle");
  };

  const handleUpgrade = () => {
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
          Descreva ou envie uma foto. <span className="gold-shimmer">A IA cria.</span>
        </h3>
        <p className="text-zinc-600 text-sm mb-5 max-w-lg">
          Escreva um sentimento, paisagem ou conceito — ou envie uma referência visual para
          que a IA extraia uma paleta refinada para resina epóxi.
        </p>

        {estado === "error" && erro ? (
          <AIErrorState erro={erro} onRetry={handleRetry} onUpgrade={handleUpgrade} />
        ) : (
          <>
            {/* Área de upload de imagem */}
            {imagem ? (
              <div
                className="mb-3 flex items-center gap-3 p-3 rounded-sm border border-gold/30 bg-gold/5"
                data-testid="ai-image-preview"
              >
                <img
                  src={imagem.dataUrl}
                  alt="referência"
                  className="w-16 h-16 object-cover rounded-sm border border-black/10"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-gold-deep mb-0.5">
                    Imagem de referência
                  </div>
                  <div className="text-sm text-zinc-700 truncate">{imagem.name}</div>
                </div>
                <button
                  type="button"
                  onClick={limparImagem}
                  className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                  data-testid="ai-image-remove"
                  aria-label="Remover imagem"
                >
                  <X className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragAtivo(true);
                }}
                onDragLeave={() => setDragAtivo(false)}
                onDrop={handleDrop}
                onClick={() => inputFileRef.current?.click()}
                className={`mb-3 flex items-center gap-3 p-3 rounded-sm border border-dashed cursor-pointer transition-colors ${
                  dragAtivo
                    ? "border-gold bg-gold/5"
                    : "border-black/15 hover:border-gold/50 hover:bg-black/[0.02]"
                }`}
                data-testid="ai-image-dropzone"
              >
                <div className="w-10 h-10 rounded-sm bg-black/5 flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-600 mb-0.5">
                    Opcional — Foto de referência
                  </div>
                  <div className="text-sm text-zinc-700">
                    Arraste ou clique para extrair paleta de uma imagem (JPG, PNG • máx 5MB)
                  </div>
                </div>
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleArquivo(e.target.files?.[0])}
                  data-testid="ai-image-input"
                />
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder={
                  imagem
                    ? 'Opcional: contexto adicional (ex: "tons mais quentes")'
                    : 'Ex: "oceano cristalino com toques dourados"'
                }
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
                {estado === "loading"
                  ? "Gerando"
                  : imagem
                  ? "Extrair paleta"
                  : "Gerar paleta"}
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

            {!imagem && (
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
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
