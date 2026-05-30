import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Palette,
  Beaker,
  Box,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { chamarIA, ApiError } from "@/utils/api";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const SEEN_KEY = "lindart.tour.v1.seen";

/**
 * OpeningTour — Tour autoexplicativo de abertura (HTML/CSS + narração IA via OpenAI TTS).
 *  - Aparece automaticamente na primeira visita (localStorage)
 *  - 4 passos com animações Framer Motion
 *  - Narração gerada por /api/ai/generate-voice (cacheada por passo)
 *  - Mute/Skip/Refazer (botão "Ver tour" no Navbar pode dispatchar `lindart:open-tour`)
 */
const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Bem-vindo ao LindArt",
    subtitle: "Studio premium de paletas para resina epóxi",
    body:
      "Em poucos cliques você cria paletas com IA, visualiza em peças reais e exporta para o seu próximo projeto.",
    narration:
      "Bem-vindo ao LindArt. O studio premium de paletas de cores para arte em resina epóxi. Em poucos cliques você cria paletas com inteligência artificial, visualiza em peças reais e exporta para o seu próximo projeto.",
    accent: "from-amber-300/40 to-amber-500/10",
  },
  {
    id: "ai",
    icon: Palette,
    title: "Paletas geradas por IA",
    subtitle: "Claude Sonnet 4.5 entende seu briefing em português",
    body:
      "Descreva o clima da sua peça — 'mar profundo com mica dourada' — e a IA monta 4 cores harmoniosas, com nomes, papéis e tags.",
    narration:
      "No Studio, descreva o clima da sua peça em português, por exemplo: mar profundo com mica dourada. A inteligência artificial monta para você uma paleta com quatro cores harmoniosas, com nomes, papéis e tags prontas para usar.",
    accent: "from-fuchsia-300/30 to-fuchsia-500/10",
  },
  {
    id: "mix",
    icon: Beaker,
    title: "Mistura realista de tintas",
    subtitle: "Swirl 2D em tempo real + vídeo cinematográfico com SVD 2.0",
    body:
      "Veja duas cores se fundindo num canvas com veios dourados, e gere um vídeo realista da mistura com a IA de vídeo da OpenAI.",
    narration:
      "No misturador, veja duas cores se fundindo em tempo real, com veios dourados e brilho de estúdio. E quando quiser, gere um vídeo cinematográfico realista da mistura usando Stable Video Diffusion 2.0.",
    accent: "from-sky-300/30 to-sky-500/10",
  },
  {
    id: "3d",
    icon: Box,
    title: "Galeria 3D interativa",
    subtitle: "Three.js + render fotorrealista com Nano Banana",
    body:
      "Arraste para girar a peça em 3D, e gere um render fotorrealista da sua paleta aplicada ao geodo, bandeja ou colar.",
    narration:
      "E na galeria três dê, arraste para girar a peça em tempo real e gere um render fotorrealista da sua paleta aplicada ao geodo, bandeja ou colar. Tudo dentro do mesmo atelier digital. Aperte começar para criar a sua primeira paleta.",
    accent: "from-emerald-300/30 to-emerald-500/10",
  },
];

export default function OpeningTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef(null);
  const cacheRef = useRef(new Map()); // step.id -> objectURL
  const ttsDisabledRef = useRef(false); // circuit breaker quando saldo IA esgota

  // Abre automaticamente na 1a visita
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (!seen) setOpen(true);
    } catch {
      setOpen(true);
    }
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("lindart:open-tour", handler);
    return () => window.removeEventListener("lindart:open-tour", handler);
  }, []);

  // Limpa cache de áudio no unmount
  useEffect(
    () => () => {
      cacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      cacheRef.current.clear();
    },
    []
  );

  const fetchNarration = async (s) => {
    if (ttsDisabledRef.current) return null;
    if (cacheRef.current.has(s.id)) return cacheRef.current.get(s.id);
    setLoadingAudio(true);
    try {
      const data = await chamarIA("/ai/generate-voice", {
        text: s.narration,
        voice: "nova",
        speed: 1.0,
      });
      const bin = atob(data.audio_base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: data.mime_type || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(s.id, url);
      return url;
    } catch (e) {
      // Se saldo esgotou ou rate-limit, desliga TTS p/ resto do tour (sem irritar usuário)
      if (
        e instanceof ApiError &&
        (e.tipo === "saldo" || e.tipo === "limite")
      ) {
        ttsDisabledRef.current = true;
      }
      return null;
    } finally {
      setLoadingAudio(false);
    }
  };

  // Toca a narração ao trocar de passo (quando aberto e não mutado)
  useEffect(() => {
    if (!open) return;
    if (muted) {
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    let cancelled = false;
    (async () => {
      const s = STEPS[step];
      const url = await fetchNarration(s);
      if (cancelled || !url || !audioRef.current) return;
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, muted]);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    if (audioRef.current) audioRef.current.pause();
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 bg-black/80 backdrop-blur-md"
        data-testid="opening-tour"
        onClick={close}
      >
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl rounded-sm overflow-hidden border border-gold-hover/30 shadow-gold-lg"
          style={{ background: "linear-gradient(180deg,#0c0c10 0%,#15151c 100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* glow ambient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className={`absolute inset-0 bg-gradient-to-br ${s.accent} pointer-events-none`}
          />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-gold/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gold-hover/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Top bar */}
          <div className="relative flex items-center justify-between p-4">
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.32em] uppercase text-gold-hover/90">
              <Sparkles className="w-3 h-3" /> Tour LindArt
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className="p-2 rounded-sm border border-white/10 text-zinc-300 hover:text-gold-hover hover:border-gold-hover/50 transition"
                data-testid="tour-mute-btn"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={close}
                className="p-2 rounded-sm border border-white/10 text-zinc-300 hover:text-gold-hover hover:border-gold-hover/50 transition"
                data-testid="tour-skip-btn"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="relative px-8 pb-8 pt-2 text-white">
            <motion.div
              key={`icon-${s.id}`}
              initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-16 h-16 rounded-sm border border-gold-hover/40 bg-black/50 backdrop-blur-md flex items-center justify-center mb-6"
            >
              <Icon className="w-7 h-7 text-gold-hover" />
            </motion.div>

            <motion.h2
              key={`title-${s.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="font-display text-3xl md:text-4xl tracking-tight leading-tight"
            >
              {s.title}
            </motion.h2>
            <motion.div
              key={`sub-${s.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[11px] tracking-[0.22em] uppercase text-gold-hover/80 mt-2"
            >
              {s.subtitle}
            </motion.div>
            <motion.p
              key={`body-${s.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-zinc-300 text-base md:text-lg leading-relaxed mt-5 max-w-prose"
            >
              {s.body}
            </motion.p>

            {/* Áudio escondido */}
            <audio
              ref={audioRef}
              data-testid="tour-audio"
              preload="auto"
              onEnded={() => {}}
            />

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-1.5" data-testid="tour-progress">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? "w-8 bg-gold-hover"
                        : "w-3 bg-white/20 hover:bg-white/30"
                    }`}
                    aria-label={`Ir para passo ${i + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {loadingAudio && !muted && (
                  <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 inline-flex items-center gap-1.5 mr-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> narrando…
                  </span>
                )}
                {step > 0 && (
                  <button
                    onClick={prev}
                    className="px-4 py-2.5 rounded-sm border border-white/10 text-zinc-300 hover:text-gold-hover hover:border-gold-hover/50 transition text-[10px] tracking-[0.22em] uppercase inline-flex items-center gap-1.5"
                    data-testid="tour-prev-btn"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                )}
                <button
                  onClick={next}
                  className="btn-gold px-5 py-2.5 rounded-sm text-[10px] tracking-[0.22em] uppercase inline-flex items-center gap-1.5"
                  data-testid="tour-next-btn"
                >
                  {step === STEPS.length - 1 ? "Começar" : "Avançar"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
