import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Check, MessageCircle, Instagram, Share2 } from "lucide-react";
import toast from "react-hot-toast";

/**
 * ShareSheet — folha de compartilhamento reutilizável.
 *
 * Props:
 *   open        boolean       — controla a visibilidade
 *   onClose     () => void
 *   url         string        — link público a ser compartilhado (obrigatório)
 *   title       string        — título exibido no topo (ex.: nome do item)
 *   description string?       — texto curto que aparece no preview
 *
 * Comportamento:
 *   • WhatsApp: abre wa.me com mensagem pré-formatada
 *   • Instagram: usa Web Share API se disponível; fallback copia o link e
 *     abre o Instagram (a rede social não permite share web direto).
 *   • Copiar link: usa Clipboard API
 */
export default function ShareSheet({ open, onClose, url, title, description }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (typeof document === "undefined") return null;

  const safeTitle = title || "Veja isso no LindArt";
  const safeDesc = description || "";
  const message = safeDesc
    ? `${safeTitle}\n${safeDesc}\n${url}`
    : `${safeTitle}\n${url}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const shareInstagram = async () => {
    // Instagram não tem share web direto. Tenta Web Share API (mobile),
    // se não houver, copia o link e abre o Instagram.
    if (navigator.share) {
      try {
        await navigator.share({ title: safeTitle, text: safeDesc, url });
        return;
      } catch {
        /* user cancelou — segue para fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado — cole no seu Story ou bio do Instagram");
    } catch {
      /* ignore */
    }
    window.open("https://instagram.com", "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={onClose}
          data-testid="share-sheet-overlay"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md bg-bone border border-gold/20 rounded-t-2xl md:rounded-sm shadow-2xl p-6 md:p-7"
            data-testid="share-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Compartilhar"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.24em] uppercase text-gold mb-1 inline-flex items-center gap-1.5">
                  <Share2 className="w-3 h-3" /> Compartilhar
                </div>
                <h3 className="font-display text-xl md:text-2xl text-zinc-900 leading-tight line-clamp-2">
                  {safeTitle}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-900 transition-colors"
                aria-label="Fechar"
                data-testid="share-sheet-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview do link */}
            <div className="mb-5 border border-black/[0.08] rounded-sm px-3 py-2.5 bg-ink-surface flex items-center gap-2 text-xs text-zinc-600 truncate">
              <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate" data-testid="share-sheet-url">{url}</span>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <ShareButton
                onClick={shareWhatsApp}
                icon={MessageCircle}
                label="WhatsApp"
                testId="share-sheet-whatsapp"
              />
              <ShareButton
                onClick={shareInstagram}
                icon={Instagram}
                label="Instagram"
                testId="share-sheet-instagram"
              />
              <ShareButton
                onClick={copyLink}
                icon={copied ? Check : Link2}
                label={copied ? "Copiado" : "Copiar link"}
                testId="share-sheet-copy"
                active={copied}
              />
            </div>

            <p className="text-[11px] text-zinc-500 italic text-center leading-relaxed">
              Quem abrir o link vê a preview no WhatsApp e cai direto no item.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ShareButton({ onClick, icon: Icon, label, testId, active = false }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex flex-col items-center gap-2 px-2 py-4 rounded-sm border transition-all ${
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-black/[0.08] bg-ink-surface text-zinc-700 hover:border-gold/50 hover:text-gold"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] tracking-[0.18em] uppercase">{label}</span>
    </button>
  );
}
