import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, Zap, ExternalLink } from "lucide-react";

/**
 * UpgradeInfoModal — exibido quando o usuário clica em "Liberar gerações
 * ilimitadas" (saldo do Universal Key esgotado). Como monetização interna
 * ainda está pausada, orientamos a recarregar o Universal Key da Emergent.
 *
 * Disparado pelo evento global `lindart:open-upgrade-info` (vide utils/api.js).
 */
export default function UpgradeInfoModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("lindart:open-upgrade-info", handler);
    return () => window.removeEventListener("lindart:open-upgrade-info", handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          data-testid="upgrade-info-modal"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-sm max-w-md w-full p-6 md:p-8 relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold/15 blur-3xl rounded-full pointer-events-none" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-sm hover:bg-black/5 transition-colors flex items-center justify-center"
              data-testid="upgrade-info-close"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-gold/15 text-gold border border-gold/30 mb-4">
                <Crown className="w-5 h-5" />
              </div>
              <h2
                className="font-display text-2xl md:text-3xl tracking-tight mb-2"
                data-testid="upgrade-info-title"
              >
                Suas gerações IA acabaram
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed mb-5">
                Todas as funcionalidades de IA do LindArt (paletas, Assinatura de Cor,
                Luxury Score, Nano Banana 3D, SVD 2.0 e narração) usam o{" "}
                <strong>Universal Key da Emergent</strong>. Recarregue-a para
                continuar criando.
              </p>

              <ol className="text-sm text-zinc-700 space-y-2 mb-6 list-decimal list-inside">
                <li>Abra seu perfil Emergent (canto superior direito do app).</li>
                <li>
                  Acesse <strong>Universal Key</strong> →{" "}
                  <strong>Adicionar saldo</strong>.
                </li>
                <li>
                  Opcional: ative o <strong>auto-recarga</strong> para nunca mais ficar
                  sem créditos.
                </li>
              </ol>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="https://app.emergent.sh/profile"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gold px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 flex-1"
                  data-testid="upgrade-info-go-btn"
                >
                  <Zap className="w-4 h-4" />
                  Recarregar agora
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase border border-black/10 hover:border-gold/60 transition-colors"
                  data-testid="upgrade-info-dismiss-btn"
                >
                  Agora não
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
