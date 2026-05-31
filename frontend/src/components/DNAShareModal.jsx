import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Link2, Loader2, Check, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import DNAShareCard from "./DNAShareCard";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

export default function DNAShareModal({ open, onClose, dna }) {
  const cardRef = useRef(null);
  const [handle, setHandle] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShareUrl("");
      setCopied(false);
    }
  }, [open]);

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#050505",
        scale: 1,
        useCORS: true,
        logging: false,
        width: 1080,
        height: 1080,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `lindart-dna-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Cartão baixado");
    } catch (e) {
      toast.error(e.message || "Falha ao gerar PNG");
    } finally {
      setDownloading(false);
    }
  };

  const createShareLink = async () => {
    if (!dna) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/dna/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: dna,
          handle: handle.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Erro ${res.status}`);
      }
      const data = await res.json();
      const full = `${window.location.origin}${data.path}`;
      setShareUrl(full);
      toast.success("Link gerado");
    } catch (e) {
      toast.error(e.message || "Falha ao gerar link");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareWhatsApp = () => {
    if (!shareUrl) return;
    const message = `Olha o DNA da minha arte em resina no LindArt 🎨\n${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
          data-testid="dna-share-modal"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-bone rounded-sm w-full max-w-5xl my-8 overflow-hidden border border-black/10"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-sm bg-black/80 text-bone flex items-center justify-center hover:bg-black"
              data-testid="dna-share-close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid lg:grid-cols-[1fr,360px]">
              {/* PREVIEW */}
              <div className="bg-zinc-900 p-6 flex items-center justify-center">
                <div
                  className="relative shadow-2xl"
                  style={{ width: 540, height: 540 }}
                >
                  <DNAShareCard
                    ref={cardRef}
                    dna={dna}
                    handle={handle.trim() || undefined}
                    compact
                  />
                </div>
              </div>

              {/* SIDEBAR */}
              <div className="p-6 md:p-7 flex flex-col gap-5 bg-bone">
                <div>
                  <div className="label-eyebrow text-gold mb-1">
                    Cartão DNA
                  </div>
                  <h3 className="font-display text-2xl tracking-tight">
                    Compartilhe sua linguagem
                  </h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Baixe como PNG ou gere um link público para postar no
                    Instagram, Etsy ou onde você quiser.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="dna-handle"
                    className="label-eyebrow text-zinc-500 mb-1.5 block"
                  >
                    Seu @ (opcional)
                  </label>
                  <input
                    id="dna-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="suaarte"
                    maxLength={40}
                    className="w-full px-3 py-2.5 rounded-sm border border-zinc-300 bg-white text-sm focus:border-gold focus:outline-none"
                    data-testid="dna-share-handle"
                  />
                </div>

                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={downloading}
                  className="btn-gold w-full py-3 rounded-sm text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="dna-share-download"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloading ? "Gerando…" : "Baixar PNG 1080×1080"}
                </button>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={createShareLink}
                    disabled={creating}
                    className="w-full py-3 rounded-sm border border-ink text-ink text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 hover:bg-ink hover:text-bone transition-colors disabled:opacity-50"
                    data-testid="dna-share-link-btn"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    {shareUrl ? "Gerar novo link" : "Gerar link público"}
                  </button>

                  {shareUrl && (
                    <>
                      <div
                        className="flex items-stretch gap-2"
                        data-testid="dna-share-link-result"
                      >
                        <input
                          readOnly
                          value={shareUrl}
                          className="flex-1 px-3 py-2 rounded-sm border border-zinc-300 bg-white text-xs font-mono text-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={copyLink}
                          className="px-3 rounded-sm bg-ink text-bone text-xs flex items-center gap-1.5 hover:bg-black"
                          data-testid="dna-share-copy"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          {copied ? "Copiado" : "Copiar"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={shareWhatsApp}
                        className="w-full py-3 rounded-sm text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 text-white transition-transform hover:-translate-y-0.5"
                        style={{ backgroundColor: "#25D366" }}
                        data-testid="dna-share-whatsapp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Compartilhar no WhatsApp
                      </button>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed mt-auto">
                  O link público mostra apenas seu cartão DNA — nenhum dado
                  pessoal é compartilhado.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
