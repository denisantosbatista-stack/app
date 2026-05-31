import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  X,
  Image as ImageIcon,
  Package,
  GraduationCap,
  Sparkles,
  BookOpen,
  Wrench,
  ShoppingBag,
  BadgeCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { Field } from "./ui/Field";

const TYPES = [
  { id: "molde", label: "Moldes", icon: Package },
  { id: "curso", label: "Cursos", icon: GraduationCap },
  { id: "preset", label: "Presets", icon: Sparkles },
  { id: "ebook", label: "E-books", icon: BookOpen },
  { id: "ferramenta", label: "Ferramentas", icon: Wrench },
  { id: "outro", label: "Outros", icon: ShoppingBag },
];

export default function CreateItemModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth();
  const authorHandle = (user?.handle || "").replace(/^@/, "");

  const [type, setType] = useState("molde");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setType("molde");
    setTitle("");
    setDescription("");
    setPrice("");
    setLink("");
    setTags("");
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
      type,
      title: title.trim(),
      description: description.trim(),
      image_base64: imageBase64,
      price_brl: price ? Number(price.replace(",", ".")) : null,
      link: link.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    setSubmitting(true);
    try {
      await onSubmit(payload);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Erro ao anunciar");
    } finally {
      setSubmitting(false);
    }
  }

  const typeOptions = useMemo(() => TYPES, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
          data-testid="market-create-modal"
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
                <div className="label-eyebrow text-gold">Novo anúncio</div>
                <h2 className="font-display text-xl text-zinc-900">Anunciar no marketplace</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-800"
                data-testid="market-create-close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                  Imagem de capa (até 4MB)
                </span>
                <div className="mt-1.5 border border-dashed border-black/15 rounded-sm p-4 text-center hover:border-gold/60 transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="max-h-48 mx-auto object-contain" />
                  ) : (
                    <div className="text-zinc-500 text-sm py-6">
                      <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                      Clique para escolher uma capa
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="block w-full mt-3 text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-black/10 file:bg-ink-surface file:text-zinc-700 file:rounded-sm file:cursor-pointer"
                    data-testid="market-create-file"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                  Categoria
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5" data-testid="market-create-types">
                  {typeOptions.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                        type === t.id
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
                      }`}
                      data-testid={`market-create-type-${t.id}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </label>

              <div
                className="rounded-sm border border-black/[0.08] bg-ink-surface px-3 py-2.5 flex items-center justify-between gap-3"
                data-testid="market-create-author"
              >
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                    Anunciando como
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
                label="Título"
                placeholder="Ex.: Molde Geodo Ø8cm — silicone premium"
                value={title}
                onChange={setTitle}
                testId="market-create-title"
              />
              <Field
                label="Descrição (opcional)"
                placeholder="Conte o que o cliente leva, materiais, bônus…"
                value={description}
                onChange={setDescription}
                multiline
                testId="market-create-desc"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Preço (BRL)"
                  placeholder="89,90"
                  value={price}
                  onChange={setPrice}
                  testId="market-create-price"
                />
                <Field
                  label="Link externo"
                  placeholder="https://hotmart.com/…"
                  value={link}
                  onChange={setLink}
                  testId="market-create-link"
                />
              </div>
              <Field
                label="Tags (separadas por vírgula)"
                placeholder="molde, premium, geodo"
                value={tags}
                onChange={setTags}
                testId="market-create-tags"
              />
            </div>
            <footer className="p-4 border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-800 px-4 py-2"
                data-testid="market-create-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-xs uppercase tracking-[0.22em] bg-zinc-900 text-bone hover:bg-zinc-800 px-5 py-2.5 rounded-sm inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="market-create-submit"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Anunciar
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
