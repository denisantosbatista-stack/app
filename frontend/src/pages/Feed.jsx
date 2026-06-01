import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Plus, Loader2, Image as ImageIcon, RefreshCw, Hash, Crown, BadgeCheck, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth, formatApiErrorDetail } from "../contexts/AuthContext";
import { authFetch } from "../utils/api";
import CreatePostModal from "../components/CreatePostModal";
import ShareSheet from "../components/ShareSheet";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);
const LIKED_KEY = "lindart.feed.liked.v1";

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

// value = tag persistida (lowercase, sem acento — para filtro no backend)
// label = exibição em CAIXA ALTA com acentuação PT-BR
const POPULAR_TAGS = [
  { value: "minimalista", label: "MINIMALISTA" },
  { value: "joalheria", label: "JOALHERIA" },
  { value: "geodo", label: "GEODO" },
  { value: "oceano", label: "OCEANO" },
  { value: "floral", label: "FLORAL" },
  { value: "fluido", label: "FLUIDO" },
  { value: "cosmico", label: "CÓSMICO" },
  { value: "natural", label: "NATURAL" },
];

export default function Feed() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(null);
  const [liked, setLiked] = useState(loadLiked());
  const [showCreate, setShowCreate] = useState(false);
  const [pick, setPick] = useState(null);

  function handleOpenCreate() {
    if (!isAuthenticated) {
      toast("Faça login para publicar no feed", { icon: "🔒" });
      navigate("/login", { state: { from: "/feed" } });
      return;
    }
    setShowCreate(true);
  }

  async function fetchPick() {
    try {
      const res = await fetch(`${API_BASE}/api/feed/pick`);
      if (!res.ok) return;
      const data = await res.json();
      setPick(data || null);
    } catch {
      /* silencioso */
    }
  }

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

  useEffect(() => {
    fetchPick();
  }, []);

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
              onClick={handleOpenCreate}
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

      {/* Pick da Semana */}
      {pick && !activeTag && <PickHero pick={pick} liked={liked.has(pick.id)} onLike={() => handleLike(pick)} />}

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
            key={t.value}
            onClick={() => setActiveTag(t.value)}
            className={`text-xs px-3 py-1.5 rounded-sm border transition-colors tracking-[0.18em] inline-flex items-center gap-1 ${
              activeTag === t.value
                ? "border-gold bg-gold/10 text-gold"
                : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
            }`}
            data-testid={`feed-tag-${t.value}`}
          >
            <Hash className="w-3 h-3" />
            {t.label}
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
        <EmptyState onCreate={handleOpenCreate} />
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

      <CreatePostModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (payload) => {
          const res = await authFetch("/feed", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            let detail;
            try {
              const j = await res.json();
              detail = j?.detail;
            } catch {
              /* ignore */
            }
            throw new Error(formatApiErrorDetail(detail) || `HTTP ${res.status}`);
          }
          const newPost = await res.json();
          setPosts((arr) => [newPost, ...arr]);
          setShowCreate(false);
          toast.success("Publicado no feed");
        }}
      />
    </div>
  );
}

function PickHero({ pick, liked, onLike }) {
  const colors = pick.palette_colors || [];
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="relative mb-10 rounded-sm overflow-hidden border border-gold/30 bg-ink-surface"
      data-testid="feed-pick-hero"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-gold/[0.06] via-transparent to-gold/[0.04]" />
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-gold/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative grid md:grid-cols-2 gap-0">
        <Link
          to={`/u/${pick.handle}`}
          className="relative block aspect-[4/3] md:aspect-auto md:min-h-[420px] overflow-hidden bg-black"
        >
          <img
            src={pick.image_url}
            alt={pick.title}
            loading="lazy"
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-[1.6s] ease-out"
            data-testid="feed-pick-image"
          />
          {Array.isArray(pick.tags) && pick.tags.includes("exemplo") && (
            <div
              className="absolute top-3 left-3 bg-gold/95 text-ink-text text-[10px] tracking-[0.24em] uppercase px-2.5 py-1 rounded-sm shadow-sm"
              data-testid={`feed-pick-example-badge-${pick.id}`}
              title="Conteúdo de demonstração curado pela equipe LindArt"
            >
              Exemplo
            </div>
          )}
        </Link>

        <div className="p-7 md:p-10 flex flex-col justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-gold border border-gold/40 px-2.5 py-1 rounded-sm mb-5">
              <Crown className="w-3 h-3" /> Pick da Semana
            </div>
            <h2
              className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] mb-4"
              data-testid="feed-pick-title"
            >
              {pick.title}
            </h2>
            {pick.description && (
              <p className="text-sm md:text-base text-zinc-600 italic leading-relaxed line-clamp-4 mb-5">
                {pick.description}
              </p>
            )}
            <Link
              to={`/u/${pick.handle}`}
              className="text-xs tracking-[0.18em] uppercase text-zinc-700 hover:text-gold inline-flex items-center gap-1.5"
              data-testid="feed-pick-handle"
            >
              @{pick.handle}
              {pick.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-gold" aria-label="Perfil verificado" />
              )}
            </Link>
          </div>

          <div className="flex items-end justify-between flex-wrap gap-4">
            {colors.length > 0 && (
              <div className="flex items-center gap-1.5">
                {colors.slice(0, 6).map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-sm border border-black/10"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
            <button
              onClick={onLike}
              className={`inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase border px-4 py-2 rounded-sm transition-colors ${
                liked
                  ? "border-gold text-gold bg-gold/10"
                  : "border-black/15 text-zinc-700 hover:border-gold hover:text-gold"
              }`}
              data-testid="feed-pick-like"
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
              {pick.likes || 0}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
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
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = `${API_BASE}/api/og/feed/${post.id}`;
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
        {Array.isArray(post.tags) && post.tags.includes("exemplo") && (
          <div
            className="absolute top-2 left-2 bg-gold/95 text-ink-text text-[10px] tracking-[0.22em] uppercase px-2 py-0.5 rounded-sm shadow-sm"
            data-testid={`feed-post-example-badge-${post.id}`}
            title="Conteúdo de demonstração curado pela equipe LindArt"
          >
            Exemplo
          </div>
        )}
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
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Compartilhar post"
          title="Compartilhar"
          className="absolute bottom-2 left-2 inline-flex items-center justify-center backdrop-blur-md bg-black/40 text-white p-1.5 rounded-full border border-white/10 hover:bg-black/60 hover:text-gold transition-colors"
          data-testid={`feed-share-${post.id}`}
        >
          <Share2 className="w-3.5 h-3.5" />
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
            className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 hover:text-gold inline-flex items-center gap-1"
            data-testid={`feed-author-${post.id}`}
          >
            @{post.handle}
            {post.verified && (
              <BadgeCheck
                className="w-3.5 h-3.5 text-gold"
                aria-label="Perfil verificado"
                data-testid={`feed-verified-${post.id}`}
              />
            )}
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

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={post.title}
        description={post.description || `Post de @${post.handle} no LindArt`}
      />
    </motion.article>
  );
}

// Field component centralized in /components/ui/Field.jsx
