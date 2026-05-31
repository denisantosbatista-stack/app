import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePaletteStore } from "@/store/usePaletteStore";
import { useAuth } from "@/contexts/AuthContext";
import SplashStep from "./SplashStep";
import SegmentStep from "./SegmentStep";
import PaletteStep from "./PaletteStep";
import GenerationStep from "./GenerationStep";
import RegisterStep from "./RegisterStep";
import WelcomeStep from "./WelcomeStep";
import { PRESET_PALETTES } from "@/data/palettes";

// Mapeia o `style` da paleta escolhida para um descritor de peça (tipoPeca) e
// o formato visual (shape) usado no passo de Geração.
// Mantemos duas fontes separadas: `label` (texto exibido) e `shape` (visual),
// evitando regressões caso o label seja traduzido/editado no futuro.
const PALETTE_TIPO_PECA = {
  geodo: { label: "geodo circular", shape: "circle" },
  floral: { label: "peça floral", shape: "circle" },
  oceano: { label: "peça oceânica", shape: "circle" },
  pastel: { label: "peça pastel", shape: "square" },
  minimalista: { label: "peça minimalista", shape: "square" },
  luxo: { label: "bandeja luxuosa", shape: "circle" },
};

function derivePieceMeta(paletteId) {
  const palette = PRESET_PALETTES.find((p) => p.id === paletteId);
  if (!palette) return { tipoPeca: "primeira peça", shape: "circle" };
  const entry = PALETTE_TIPO_PECA[palette.style];
  return entry
    ? { tipoPeca: entry.label, shape: entry.shape }
    : { tipoPeca: "peça autoral", shape: "circle" };
}

const DONE_KEY = "lindart.onboarding.v1.completed";
const DATA_KEY = "lindart.onboarding.v1.data";
const TOUR_SEEN_KEY = "lindart.tour.v1.seen";

const STEPS = ["splash", "segment", "palette", "generation", "register", "welcome"];

// Rotas públicas / anônimas onde o onboarding NÃO deve abrir automaticamente.
// Visitantes chegando via WhatsApp/IG (links de perfil, feed, posts, planos,
// privacidade, login/register) precisam ver o conteúdo direto, sem modal por cima.
// O fluxo continua disponível via evento `lindart:open-onboarding` em qualquer rota.
const PUBLIC_PATH_PREFIXES = [
  "/u/",
  "/feed",
  "/dna/",
  "/planos",
  "/privacidade",
  "/login",
  "/register",
];

function isPublicPath(pathname) {
  if (!pathname) return false;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );
}

export default function OnboardingFlow() {
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    segment: null,
    paletteId: null,
    name: "",
    email: "",
  });
  const setActivePalette = usePaletteStore((s) => s.setActivePalette);
  const setOnboardingCompleted = usePaletteStore((s) => s.setOnboardingCompleted);
  const setUserSegment = usePaletteStore((s) => s.setUserSegment);
  const setUserIdentity = usePaletteStore((s) => s.setUserIdentity);

  const onboardingCompletedStore = usePaletteStore((s) => s.onboardingCompleted);
  const hasHydrated = usePaletteStore((s) => s._hasHydrated);

  // Auto-open na primeira visita — só decide DEPOIS da hidratação do Zustand
  // persist, senão o estado inicial (false) sobrepõe o Studio mesmo para
  // usuários que já concluíram o onboarding.
  // Em rotas públicas (perfis, feed, posts compartilhados, planos, privacidade,
  // login/register) o auto-open é suprimido para não bloquear visitantes
  // anônimos chegando via link.
  useEffect(() => {
    if (!hasHydrated) return;
    if (authLoading) return;
    // Tour de onboarding só dispara para usuários autenticados.
    // Em rotas públicas (/, /pricing, /tendencias, /u/, /feed, etc.) e para
    // visitantes anônimos vindos de links compartilhados, o modal nunca abre.
    if (!isAuthenticated) return;
    if (isPublicPath(location.pathname)) return;
    try {
      const done = localStorage.getItem(DONE_KEY);
      if (onboardingCompletedStore || done) {
        if (!done) {
          try { localStorage.setItem(DONE_KEY, "1"); } catch {}
        }
        return;
      }
      // Primeira visita: marca o tour antigo como visto (evita conflito com OpeningTour)
      localStorage.setItem(TOUR_SEEN_KEY, "1");
      setOpen(true);
    } catch {
      if (!onboardingCompletedStore) setOpen(true);
    }
  }, [hasHydrated, onboardingCompletedStore, location.pathname, isAuthenticated, authLoading]);

  // Listener para reabrir manualmente (ex: via UI de configurações)
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("lindart:open-onboarding", handler);
    return () => window.removeEventListener("lindart:open-onboarding", handler);
  }, []);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const close = () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {}
    setOnboardingCompleted(true);
    if (data.segment) setUserSegment(data.segment);
    if (data.name || data.email) setUserIdentity({ name: data.name, email: data.email });
    setOpen(false);
  };

  const finish = () => {
    // Aplica paleta escolhida ao studio
    if (data.paletteId) setActivePalette(data.paletteId);
    close();
  };

  const showTourAfterFinish = () => {
    finish();
    // Reabre o tour clássico como referência opcional
    setTimeout(() => {
      try {
        localStorage.removeItem(TOUR_SEEN_KEY);
      } catch {}
      window.dispatchEvent(new Event("lindart:open-tour"));
    }, 200);
  };

  // Guard final: nunca renderiza nada para visitantes não autenticados,
  // mesmo que um evento `lindart:open-onboarding` seja disparado.
  if (!isAuthenticated) return null;
  if (!open) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[130] flex items-center justify-center px-4 py-6 overflow-y-auto"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(212,175,55,0.18), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(184,149,74,0.12), transparent 60%), rgba(244, 239, 230, 0.94)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        data-testid="onboarding-flow"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl my-auto"
        >
          {/* Botão de fechar (skip all) */}
          {step > 0 && step < STEPS.length - 1 && (
            <button
              onClick={close}
              data-testid="onboarding-close-btn"
              className="absolute -top-2 right-0 md:top-0 md:-right-2 p-2 rounded-sm border border-black/[0.08] bg-white/80 text-ink-muted hover:text-ink-text hover:border-gold/40 transition"
              aria-label="Pular onboarding"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Progress bar (sempre visível para a usuária saber quantos passos faltam) */}
          <div
            className="mb-8 flex items-center gap-1.5"
            data-testid="onboarding-progress"
          >
            {STEPS.slice(1).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full flex-1 transition-all ${
                  i + 1 <= step ? "bg-gold" : "bg-black/[0.08]"
                }`}
              />
            ))}
            <span className="ml-3 text-[10px] tracking-[0.22em] uppercase text-ink-muted whitespace-nowrap">
              {step === 0
                ? `${STEPS.length - 1} passos`
                : `${step} / ${STEPS.length - 1}`}
            </span>
          </div>

          <div className="glass-strong rounded-sm p-8 md:p-12 relative overflow-hidden">
            {/* Glow decorativo */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-gold/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gold-deep/8 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {current === "splash" && <SplashStep onNext={next} />}
                  {current === "segment" && (
                    <SegmentStep
                      value={data.segment}
                      onChange={(v) => setData((d) => ({ ...d, segment: v }))}
                      onNext={next}
                    />
                  )}
                  {current === "palette" && (
                    <PaletteStep
                      value={data.paletteId}
                      onChange={(v) => setData((d) => ({ ...d, paletteId: v }))}
                      onNext={next}
                      onBack={back}
                    />
                  )}
                  {current === "generation" && (() => {
                    const meta = derivePieceMeta(data.paletteId);
                    return (
                      <GenerationStep
                        paletteId={data.paletteId}
                        tipoPeca={meta.tipoPeca}
                        shape={meta.shape}
                        onNext={next}
                        onBack={back}
                      />
                    );
                  })()}
                  {current === "register" && (
                    <RegisterStep
                      value={{ name: data.name, email: data.email }}
                      onChange={(v) => setData((d) => ({ ...d, ...v }))}
                      onNext={next}
                      onBack={back}
                      onSkip={next}
                    />
                  )}
                  {current === "welcome" && (
                    <WelcomeStep
                      data={data}
                      onFinish={finish}
                      onShowTour={showTourAfterFinish}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
