import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, Image as ImageIcon, BadgeCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { Field } from "./ui/Field";

export default function SubmitChallengeModal({ isOpen, onClose, onSubmit, themeColor }) {
  const { user } = useAuth();
  const authorHandle = (user?.handle || "").replace(/^@/, "");

  const [caption, setCaption] = useState("");
  const [palette, setPalette] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setCaption("");
    setPalette("");
    setImageBase64("");
    setImagePreview("");
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result || "");
      setImagePreview(reader.result || "");
    };
    reader.readAsDataURL(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authorHandle) {
      toast.error("Sua conta não possui handle. Atualize seu perfil.");
      return;
    }
    if (!imageBase64) {
      toast.error("Imagem é obrigatória");
      return;
    }
    const payload = {
      caption: caption.trim(),
      image_base64: imageBase64,
      palette_colors: palette
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)),
    };
    setSubmitting(true);
    try {
      await onSubmit(payload);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Erro ao enviar peça");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="challenge-submit-modal"
        >
          <motion.form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="bg-bone w-full max-w-lg rounded-sm border border-black/10 max-h-[92vh] overflow-y-auto"
          >
            <header className="flex items-center justify-between p-4 border-b border-black/[0.06]">
              <div>
                <div className="label-eyebrow" style={{ color: themeColor || "#D4B260" }}>
                  Enviar peça
                </div>
                <h2 className="font-display text-xl text-zinc-900">Sua submissão</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-800"
                data-testid="challenge-submit-close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                  Imagem da peça (até 4MB)
                </span>
                <div className="mt-1.5 border border-dashed border-black/15 rounded-sm p-4 text-center hover:border-gold/60 transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="max-h-48 mx-auto object-contain" />
                  ) : (
                    <div className="text-zinc-500 text-sm py-6">
                      <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                      Clique para escolher imagem
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="block w-full mt-3 text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-black/10 file:bg-ink-surface file:text-zinc-700 file:rounded-sm file:cursor-pointer"
                    data-testid="challenge-submit-file"
                  />
                </div>
              </label>

              <div
                className="rounded-sm border border-black/[0.08] bg-ink-surface px-3 py-2.5 flex items-center justify-between gap-3"
                data-testid="challenge-submit-author"
              >
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                    Enviando como
                  </div>
                  <div className="font-display text-base mt-0.5 inline-flex items-center gap-1.5">
                    @{authorHandle || "—"}
                    <BadgeCheck className="w-4 h-4 text-gold" />
                  </div>
                </div>
                <span className="text-[10px] tracking-[0.22em] uppercase text-gold">
                  Perfil Verificado
                </span>
              </div>
              <Field
                label="Legenda (opcional)"
                placeholder="Conte sobre a peça…"
                value={caption}
                onChange={setCaption}
                multiline
                testId="challenge-submit-caption"
              />
              <Field
                label="Paleta usada (hex separados por vírgula)"
                placeholder="#1b3a4b, #f4f1ea"
                value={palette}
                onChange={setPalette}
                testId="challenge-submit-palette"
              />
            </div>
            <footer className="p-4 border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-800 px-4 py-2"
                data-testid="challenge-submit-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-xs uppercase tracking-[0.22em] bg-zinc-900 text-bone hover:bg-zinc-800 px-5 py-2.5 rounded-sm inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="challenge-submit-confirm"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enviar peça
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
