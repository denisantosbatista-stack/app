import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Plus, Loader2, Image as ImageIcon, Hash, BadgeCheck, Share2 } from "lucide-react";
import ShareSheet from "./ShareSheet";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

// value = tag persistida (lowercase, sem acento — para filtro no backend)
// label = exibição em sentence case com acentuação PT-BR
const POPULAR_TAGS = [
  { value: "minimalista", label: "Minimalista" },
  { value: "joalheria", label: "Joalheria" },
  { value: "geodo", label: "Geodo" },
  { value: "oceano", label: "Oceano" },
  { value: "floral", label: "Floral" },
  { value: "fluido", label: "Fluido" },
  { value: "cosmico", label: "Cósmico" },
  { value: "natural", label: "Natural" },
];

/**
 * FeedPostsView — view dedicada aos posts do feed (tags, grid masonry, empty state).
 * Extraído de Feed.jsx para reduzir tamanho do arquivo principal sem alterar lógica.
 *
 * Props:
 *  - posts, loading, activeTag, setActiveTag
 *  - liked (Set), onLike(post), onOpenCreate(), columns (Array<Array<post>>)
 */
export default function FeedPostsView({
  posts,
  loading,
  activeTag,
  setActiveTag,
  liked,
  onLike,
  onOpenCreate,
  columns,
}) {
  return (
    <>
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8" data-testid="feed-tags">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs px-3 py-1.5 rounded-sm border transition-colors tracking-[0.04em] ${
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
            className={`text-xs px-3 py-1.5 rounded-sm border transition-colors tracking-[0.04em] inline-flex items-center gap-1 ${
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
        <EmptyState onCreate={onOpenCreate} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3 md:gap-4">
              {col.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={liked.has(post.id)}
                  onLike={() => onLike(post)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
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
