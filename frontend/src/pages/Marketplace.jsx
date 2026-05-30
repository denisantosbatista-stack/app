import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Loader2,
  X,
  ExternalLink,
  Search,
  Image as ImageIcon,
  RefreshCw,
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
import { Field } from "../components/ui/Field";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "lindart.auth.token";

const TYPES = [
  { id: "molde", label: "Moldes", icon: Package },
  { id: "curso", label: "Cursos", icon: GraduationCap },
  { id: "preset", label: "Presets", icon: Sparkles },
  { id: "ebook", label: "E-books", icon: BookOpen },
  { id: "ferramenta", label: "Ferramentas", icon: Wrench },
  { id: "outro", label: "Outros", icon: ShoppingBag },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.id, t.label]));
const TYPE_ICON = Object.fromEntries(TYPES.map((t) => [t.id, t.icon]));

function formatBRL(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  } catch {
    return `R$ ${value}`;
  }
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(null);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function handleOpenCreate() {
    if (!isAuthenticated) {
      toast("Faça login para anunciar", { icon: "🔒" });
      navigate("/login", { state: { from: "/marketplace" } });
      return;
    }
    setShowCreate(true);
  }

  async function fetchItems(filterType = type, query = q) {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/marketplace`);
      url.searchParams.set("limit", "60");
      if (filterType) url.searchParams.set("type", filterType);
      if (query && query.trim()) url.searchParams.set("q", query.trim());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar o marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems(type, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleClick(item) {
    if (!item.link) {
      toast("Item sem link externo configurado", { duration: 1800 });
      return;
    }
    // Otimista
    setItems((arr) =>
      arr.map((it) => (it.id === item.id ? { ...it, clicks: (it.clicks || 0) + 1 } : it)),
    );
    try {
      fetch(`${API_BASE}/api/marketplace/${item.id}/click`, { method: "POST" });
    } catch {
      /* analytics best-effort */
    }
    window.open(item.link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-10" data-testid="marketplace-page">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="label-eyebrow text-gold">Marketplace LindArt</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchItems(type, q)}
              disabled={loading}
              className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 hover:text-gold inline-flex items-center gap-1.5 disabled:opacity-50"
              data-testid="market-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              onClick={handleOpenCreate}
              className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-4 py-2 inline-flex items-center gap-2 rounded-sm"
              data-testid="market-open-create"
            >
              <Plus className="w-3.5 h-3.5" /> Anunciar
            </button>
          </div>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          O <span className="italic gold-shimmer">marketplace</span> da resina
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
          Moldes, cursos, presets e ferramentas — direto dos ateliês que criam tendência.
        </p>
      </motion.header>

      {/* Search + Filters */}
      <div className="mb-7 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchItems(type, q);
          }}
          className="relative max-w-md"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full pl-9 pr-3 py-2.5 bg-ink-surface border border-black/[0.08] rounded-sm text-sm text-zinc-900 focus:border-gold focus:outline-none"
            data-testid="market-search"
          />
        </form>

        <div className="flex flex-wrap gap-2" data-testid="market-types">
          <FilterChip
            active={type === null}
            onClick={() => setType(null)}
            testId="market-type-all"
          >
            Tudo
          </FilterChip>
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <FilterChip
                key={t.id}
                active={type === t.id}
                onClick={() => setType(t.id)}
                testId={`market-type-${t.id}`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div className="py-20 flex items-center justify-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando marketplace…
        </div>
      ) : items.length === 0 ? (
        <EmptyState onCreate={handleOpenCreate} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={() => handleClick(item)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateItemModal
            user={user}
            onClose={() => setShowCreate(false)}
            onCreated={(created) => {
              setItems((arr) => [created, ...arr]);
              setShowCreate(false);
              toast.success("Item anunciado");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ active, onClick, children, testId }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-[0.18em] inline-flex items-center gap-1.5 ${
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="border border-black/[0.06] bg-ink-surface rounded-sm p-12 text-center" data-testid="market-empty">
      <ShoppingBag className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
      <h3 className="font-display text-xl text-zinc-800 mb-2">Vitrine vazia, por enquanto</h3>
      <p className="text-zinc-600 text-sm mb-6 max-w-md mx-auto">
        Seja o primeiro a anunciar um molde, curso ou preset e ganhe destaque na vitrine LindArt.
      </p>
      <button
        onClick={onCreate}
        className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-5 py-2.5 inline-flex items-center gap-2 rounded-sm"
        data-testid="market-empty-cta"
      >
        <Plus className="w-3.5 h-3.5" /> Anunciar primeiro item
      </button>
    </div>
  );
}

function ItemCard({ item, onOpen }) {
  const Icon = TYPE_ICON[item.type] || ShoppingBag;
  const price = formatBRL(item.price_brl);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors flex flex-col"
      data-testid={`market-item-${item.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <img
          src={item.image_url}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded-sm">
          <Icon className="w-3 h-3" />
          {TYPE_LABEL[item.type] || "Item"}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm text-zinc-900 leading-tight line-clamp-2">{item.title}</h3>
        {item.description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <Link
            to={`/u/${encodeURIComponent(item.handle)}`}
            className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 hover:text-gold inline-flex items-center gap-1"
            data-testid={`market-author-${item.id}`}
          >
            @{item.handle}
            {item.verified && (
              <BadgeCheck className="w-3 h-3 text-gold" title="Perfil Verificado" />
            )}
          </Link>
          {price && (
            <span className="text-sm font-display text-zinc-900" data-testid={`market-price-${item.id}`}>
              {price}
            </span>
          )}
        </div>
        <button
          onClick={onOpen}
          disabled={!item.link}
          className="mt-1 w-full text-[10px] tracking-[0.22em] uppercase bg-zinc-900 text-bone hover:bg-zinc-800 px-3 py-2 rounded-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid={`market-open-${item.id}`}
        >
          <ExternalLink className="w-3 h-3" />
          {item.link ? "Ver no site" : "Sem link"}
        </button>
      </div>
    </motion.article>
  );
}

function CreateItemModal({ user, onClose, onCreated }) {
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

  async function submit(e) {
    e.preventDefault();
    if (!authorHandle) {
      toast.error("Sua conta não possui handle. Atualize seu perfil.");
      return;
    }
    if (!title.trim() || !imageBase64) {
      toast.error("Título e imagem são obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const body = {
        type,
        title: title.trim(),
        description: description.trim(),
        image_base64: imageBase64,
        price_brl: price ? Number(price.replace(",", ".")) : null,
        link: link.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch(`${API_BASE}/api/marketplace`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `HTTP ${res.status}`);
      }
      const created = await res.json();
      onCreated(created);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao anunciar");
    } finally {
      setSubmitting(false);
    }
  }

  const typeOptions = useMemo(() => TYPES, []);

  return (
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
        onSubmit={submit}
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
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-800" data-testid="market-create-close">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">Imagem de capa (até 4MB)</span>
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
            <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">Categoria</span>
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

          <div className="rounded-sm border border-black/[0.08] bg-ink-surface px-3 py-2.5 flex items-center justify-between gap-3" data-testid="market-create-author">
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
          <Field label="Título" placeholder="Ex.: Molde Geode Ø8cm — silicone premium" value={title} onChange={setTitle} testId="market-create-title" />
          <Field label="Descrição (opcional)" placeholder="Conte o que o cliente leva, materiais, bônus…" value={description} onChange={setDescription} multiline testId="market-create-desc" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (BRL)" placeholder="89,90" value={price} onChange={setPrice} testId="market-create-price" />
            <Field label="Link externo" placeholder="https://hotmart.com/…" value={link} onChange={setLink} testId="market-create-link" />
          </div>
          <Field label="Tags (separadas por vírgula)" placeholder="molde, premium, geode" value={tags} onChange={setTags} testId="market-create-tags" />
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
  );
}

// Field component centralized in /components/ui/Field.jsx
