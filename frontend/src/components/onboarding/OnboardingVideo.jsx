import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Sparkles, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const MANUAL_URL = process.env.REACT_APP_ONBOARDING_VIDEO_URL;

/**
 * Vídeo de boas-vindas do onboarding.
 *
 * Ordem de precedência:
 *  1. `REACT_APP_ONBOARDING_VIDEO_URL` (override manual, embed YouTube/Vimeo).
 *  2. Vídeo branded gerado por Sora 2 e servido em `/api/static/onboarding-welcome.mp4`.
 *  3. Placeholder elegante (gradiente dourado) com aviso "em breve".
 *
 * Faz polling leve enquanto o status é "processing" (job Sora 2 em andamento).
 */
export default function OnboardingVideo() {
  const [state, setState] = useState({
    loading: true,
    exists: false,
    url: null,
    status: "idle",
  });
  const [playing, setPlaying] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (MANUAL_URL) {
      setState({ loading: false, exists: true, url: MANUAL_URL, status: "manual" });
      return;
    }

    let cancelled = false;

    async function fetchStatus() {
      try {
        const r = await fetch(`${BACKEND_URL}/api/onboarding/welcome-video`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error("status_failed");
        const data = await r.json();
        if (cancelled) return;
        setState({
          loading: false,
          exists: !!data.exists,
          url: data.url ? `${BACKEND_URL}${data.url}` : null,
          status: data.status || "idle",
        });
        // Continua o polling se ainda está processando
        if (data.status === "processing" && !data.exists) {
          pollRef.current = setTimeout(fetchStatus, 6000);
        }
      } catch {
        if (!cancelled) {
          setState({ loading: false, exists: false, url: null, status: "error" });
        }
      }
    }

    fetchStatus();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const wrapperClass = "mt-8 max-w-md mx-auto";
  const baseAnim = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.9, duration: 0.6 },
  };

  // 1) Override manual via YouTube/Vimeo
  if (MANUAL_URL) {
    return (
      <motion.div {...baseAnim} className={wrapperClass} data-testid="onboarding-video">
        <div className="relative rounded-sm overflow-hidden border border-gold/30 bg-black aspect-video shadow-[0_8px_32px_rgba(184,149,74,0.18)]">
          {playing ? (
            <iframe
              src={`${MANUAL_URL}${MANUAL_URL.includes("?") ? "&" : "?"}autoplay=1&rel=0`}
              title="LindArt - Vídeo de boas-vindas"
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid="onboarding-video-iframe"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 via-black/50 to-gold-deep/20 group cursor-pointer"
              data-testid="onboarding-video-play"
              aria-label="Reproduzir vídeo de boas-vindas"
            >
              <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                <PlayCircle className="w-10 h-10 text-gold-deep" />
              </div>
              <span className="absolute bottom-3 left-4 text-[10px] tracking-[0.28em] uppercase text-white/90">
                Assista · 60s
              </span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 2) Vídeo branded Sora 2 disponível
  if (state.exists && state.url) {
    return (
      <motion.div {...baseAnim} className={wrapperClass} data-testid="onboarding-video">
        <div className="relative rounded-sm overflow-hidden border border-gold/30 bg-black aspect-video shadow-[0_8px_32px_rgba(184,149,74,0.18)]">
          <video
            src={state.url}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            data-testid="onboarding-video-element"
          />
          <div className="absolute bottom-2 left-3 text-[9px] tracking-[0.3em] uppercase text-white/80 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
            LindArt · Sora 2
          </div>
        </div>
      </motion.div>
    );
  }

  // 3) Placeholder — processing (Sora 2 gerando) ou idle
  const isProcessing = state.status === "processing";
  return (
    <motion.div
      {...baseAnim}
      className={wrapperClass}
      data-testid="onboarding-video-placeholder"
    >
      <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/8 via-white/60 to-gold-deep/8 backdrop-blur-sm aspect-video flex items-center justify-center group">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(212,175,55,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(184,149,74,0.3), transparent 60%)",
          }}
        />
        <div className="relative text-center px-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full border border-gold/40 bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg">
            {isProcessing ? (
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            ) : (
              <Sparkles className="w-6 h-6 text-gold" />
            )}
          </div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-gold-deep mb-1">
            {isProcessing ? "Sora 2 · gerando" : "Tour em vídeo"}
          </div>
          <div className="text-sm text-ink-text font-medium">
            {isProcessing
              ? "Vídeo institucional sendo criado…"
              : "Vídeo de boas-vindas em breve"}
          </div>
          <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
            {isProcessing
              ? "Recarregue em alguns instantes para assistir."
              : "Por enquanto, siga o tour guiado interativo."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
