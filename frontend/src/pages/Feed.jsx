import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Plus, Loader2, X, Image as ImageIcon, RefreshCw, Hash } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const LIKED_KEY = "lindart.feed.liked.v1";
const HANDLE_KEY = "lindart.author.handle.v1";

function loadLiked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveLiked(set) {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const POPULAR_TAGS = ["minimalista", "joalheria", "geode", "ocean", "petal", "fluido", "cosmico", "natural"];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(null);
  const [liked, setLiked] = useState(loadLiked());
  const [showCreate, setShowCreate] = useState(false);

  async function fetchFeed(tag = null) {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/feed`);
      url.searchParams.set("limit", "60");
      if (tag) url.searchParams.set("tag", tag);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPosts(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar o feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeed(activeTag);
  }, [activeTag]);

  async function handleLike(post) {
    if (liked.has(post.id)) {
      toast("Você já curtiu este post ✦", { duration: 1400 });
      return;
    }
    // Otimista
    setPosts((arr) => arr.map((p) => (p.id === post.id ? { ...p, likes: (p.likes || 0) + 1 } : p)));
    const next = new Set(liked);
    next.add(post.id);
    setLiked(next);
    saveLiked(next);
    try {
      await fetch(`${API_BASE}/api/feed/${post.id}/like`, { method: "POST" });
    } catch {
      // rollback silencioso
    }
  }

  // Distribui posts em 2 / 3 / 4 colunas para masonry CSS
  const columns = useMemo(() => {
    const cols = [[], [], [], []];
    posts.forEach((p, i) => cols[i % 4].push(p));
    return cols;
  }, [posts]);

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-6" data-testid="feed-page">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="label-eyebrow text-gold">Feed da Comunidade</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchFeed(activeTag)}
              disabled={loading}
              className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 hover:text-gold inline-flex items-center gap-1.5 disabled:opacity-50"
              data-testid="feed-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-4 py-2 inline-flex items-center gap-2 rounded-sm"
              data-testid="feed-open-create"
            >
              <Plus className="w-3.5 h-3.5" /> Publicar
            </button>
          </div>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Descubra <span className="italic gold-shimmer">resina</span> de verdade
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
          Inspirações, paletas e processos do ateliê de quem cria com cor.
        </p>
      </motion.header>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8" data-testid="feed-tags">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-[0.18em] ${
            activeTag === null
              ? "border-gold bg-gold/10 text-gold"
              : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
          }`}
          data-testid="feed-tag-all"
        >
          Tudo
        </button>
        {POPULAR_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTag(t)}
            className={`text-xs px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-[0.18em] inline-flex items-center gap-1 ${
              activeTag === t
                ? "border-gold bg-gold/10 text-gold"
                : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
            }`}
            data-testid={`feed-tag-${t}`}
          >
            <Hash className="w-3 h-3" />
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && posts.length === 0 ? (
        <div className="py-20 flex items-center justify-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando feed…
        </div>
      ) : posts.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3 md:gap-4">
              {col.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={liked.has(post.id)}
                  onLike={() => handleLike(post)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreatePostModal
            onClose={() => setShowCreate(false)}
            onCreated={(newPost) => {
              setPosts((arr) => [newPost, ...arr]);
              setShowCreate(false);
              toast.success("Publicado no feed");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="border border-black/[0.06] bg-ink-surface rounded-sm p-12 text-center" data-testid="feed-empty">
      <ImageIcon className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
      <h3 className="font-display text-xl text-zinc-800 mb-2">Ainda silêncio por aqui</h3>
      <p className="text-zinc-600 text-sm mb-6 max-w-md mx-auto">
        Seja o primeiro a publicar uma peça e dar início à galeria da comunidade LindArt.
      </p>
      <button
        onClick={onCreate}
        className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-5 py-2.5 inline-flex items-center gap-2 rounded-sm"
        data-testid="feed-empty-cta"
      >
        <Plus className="w-3.5 h-3.5" /> Publicar primeiro post
      </button>
    </div>
  );
}

function PostCard({ post, liked, onLike }) {
  const colors = post.palette_colors || [];
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors"
      data-testid={`feed-post-${post.id}`}
    >
      <div className="relative">
        <img
          src={post.image_url}
          alt={post.title}
          loading="lazy"
          className="w-full h-auto object-cover block"
        />
        <button
          onClick={onLike}
          className={`absolute bottom-2 right-2 inline-flex items-center gap-1.5 backdrop-blur-md bg-black/40 text-white text-xs px-2.5 py-1.5 rounded-full border border-white/10 transition-all ${
            liked ? "text-gold" : "hover:bg-black/60"
          }`}
          data-testid={`feed-like-${post.id}`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-gold" : ""}`} />
          {post.likes || 0}
        </button>
      </div>
      <div className="p-3">
        <h3 className="text-sm text-zinc-800 leading-tight line-clamp-2 mb-1">{post.title}</h3>
        {post.description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2">{post.description}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/u/${encodeURIComponent(post.handle)}`}
            className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 hover:text-gold"
            data-testid={`feed-author-${post.id}`}
          >
            @{post.handle}
          </Link>
          {colors.length > 0 && (
            <div className="flex gap-0.5">
              {colors.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-[1px] border border-black/10"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function CreatePostModal({ onClose, onCreated }) {
  const [handle, setHandle] = useState(() => localStorage.getItem(HANDLE_KEY) || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [palette, setPalette] = useState("");
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
    if (!handle.trim() || !title.trim() || !imageBase64) {
      toast.error("Handle, título e imagem são obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        handle: handle.trim(),
        title: title.trim(),
        description: description.trim(),
        image_base64: imageBase64,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        palette_colors: palette
          .split(",")
          .map((c) => c.trim())
          .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)),
      };
      const res = await fetch(`${API_BASE}/api/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `HTTP ${res.status}`);
      }
      const created = await res.json();
      localStorage.setItem(HANDLE_KEY, handle.trim().replace(/^@/, ""));
      onCreated(created);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        onSubmit={submit}
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
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-800" data-testid="feed-create-close">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">Imagem (até 4MB)</span>
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

          <Field label="Seu handle" placeholder="@suaarte" value={handle} onChange={setHandle} testId="feed-create-handle" />
          <Field label="Título da peça" placeholder="Ex.: Geode Cosmos · azul cobalto" value={title} onChange={setTitle} testId="feed-create-title" />
          <Field label="Descrição (opcional)" placeholder="Conte o processo, mood, materiais…" value={description} onChange={setDescription} multiline testId="feed-create-desc" />
          <Field label="Tags (separadas por vírgula)" placeholder="geode, ocean, premium" value={tags} onChange={setTags} testId="feed-create-tags" />
          <Field label="Paleta usada (hex separados por vírgula)" placeholder="#1b3a4b, #f4f1ea" value={palette} onChange={setPalette} testId="feed-create-palette" />
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
  );
}

function Field({ label, value, onChange, placeholder, multiline, testId }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="block w-full mt-1.5 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900 focus:border-gold focus:outline-none"
          data-testid={testId}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full mt-1.5 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900 focus:border-gold focus:outline-none"
          data-testid={testId}
        />
      )}
    </label>
  );
}
