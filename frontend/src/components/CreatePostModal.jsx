import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, Image as ImageIcon, BadgeCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { Field } from "./ui/Field";

export default function CreatePostModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth();
  const authorHandle = (user?.handle || "").replace(/^@/, "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [palette, setPalette] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setDescription("");
    setTags("");
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
    if (!title.trim() || !imageBase64) {
      toast.error("Título e imagem são obrigatórios");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      image_base64: imageBase64,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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
      toast.error(err?.message || "Erro ao publicar");
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
          data-testid="feed-create-modal"
        >
          <motion.form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="bg-bone w-full max-w-lg rounded-sm border border-black/10 max-h-[90vh] overflow-y-auto"
          >
            <header className="flex items-center justify-between p-4 border-b border-black/[0.06]">
              <div>
                <div className="label-eyebrow text-gold">Novo post</div>
                <h2 className="font-display text-xl text-zinc-900">Publicar no feed</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-800"
                data-testid="feed-create-close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                  Imagem (até 4MB)
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
                    data-testid="feed-create-file"
                  />
                </div>
              </label>

              <div className="block">
                <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">Autor</span>
                <div
                  className="mt-1.5 flex items-center justify-between gap-2 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900"
                  data-testid="feed-create-author"
                >
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-gold" />
                    @{authorHandle || "—"}
                  </span>
                  <span className="text-[10px] tracking-[0.22em] uppercase text-gold">
                    Perfil Verificado
                  </span>
                </div>
              </div>
              <Field
                label="Título da peça"
                placeholder="Ex.: Geode Cosmos · azul cobalto"
                value={title}
                onChange={setTitle}
                testId="feed-create-title"
              />
              <Field
                label="Descrição (opcional)"
                placeholder="Conte o processo, mood, materiais…"
                value={description}
                onChange={setDescription}
                multiline
                testId="feed-create-desc"
              />
              <Field
                label="Tags (separadas por vírgula)"
                placeholder="geode, ocean, premium"
                value={tags}
                onChange={setTags}
                testId="feed-create-tags"
              />
              <Field
                label="Paleta usada (hex separados por vírgula)"
                placeholder="#1b3a4b, #f4f1ea"
                value={palette}
                onChange={setPalette}
                testId="feed-create-palette"
              />
            </div>
            <footer className="p-4 border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-800 px-4 py-2"
                data-testid="feed-create-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-xs uppercase tracking-[0.22em] bg-zinc-900 text-bone hover:bg-zinc-800 px-5 py-2.5 rounded-sm inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="feed-create-submit"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Publicar
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
