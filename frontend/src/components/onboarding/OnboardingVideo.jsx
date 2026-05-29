import { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Sparkles } from "lucide-react";

/**
 * Vídeo instrucional opcional para o onboarding.
 * Se REACT_APP_ONBOARDING_VIDEO_URL estiver definido (YouTube/Vimeo embed URL),
 * exibe um player. Caso contrário, mostra um placeholder elegante.
 */
const VIDEO_URL = process.env.REACT_APP_ONBOARDING_VIDEO_URL;

export default function OnboardingVideo() {
  const [playing, setPlaying] = useState(false);

  if (!VIDEO_URL) {
    // Placeholder elegante quando ainda não há vídeo configurado
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="mt-8 max-w-md mx-auto"
        data-testid="onboarding-video-placeholder"
      >
        <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/8 via-white/60 to-gold-deep/8 backdrop-blur-sm aspect-video flex items-center justify-center group">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
               style={{
                 background: "radial-gradient(circle at 30% 30%, rgba(212,175,55,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(184,149,74,0.3), transparent 60%)"
               }}
          />
          <div className="relative text-center px-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full border border-gold/40 bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-gold-deep mb-1">
              Tour em vídeo
            </div>
            <div className="text-sm text-ink-text font-medium">
              Vídeo de boas-vindas em breve
            </div>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Por enquanto, siga o tour guiado interativo.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="mt-8 max-w-md mx-auto"
      data-testid="onboarding-video"
    >
      <div className="relative rounded-sm overflow-hidden border border-gold/30 bg-black aspect-video shadow-[0_8px_32px_rgba(184,149,74,0.18)]">
        {playing ? (
          <iframe
            src={`${VIDEO_URL}${VIDEO_URL.includes("?") ? "&" : "?"}autoplay=1&rel=0`}
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
