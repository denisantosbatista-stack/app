import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Heart,
  Home,
  Image as ImageIcon,
  ShoppingBag,
  Sparkles,
  Trophy,
  ExternalLink,
  UserX,
  Share2,
} from "lucide-react";
import ShareSheet from "../components/ShareSheet";
import { authFetch } from "@/utils/api";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

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

export default function PublicProfile() {
  const { handle } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { kind: 'not_found' | 'network' | 'server', message }
  const [tab, setTab] = useState("posts");
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [sharePost, setSharePost] = useState(null); // { id, title, description } | null

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/profile/${encodeURIComponent(handle)}`,
        );
        if (res.status === 404) {
          let payload;
          try {
            payload = await res.json();
          } catch {
            /* noop */
          }
          const detail = payload?.detail;
          const message =
            (detail && typeof detail === "object" && detail.message) ||
            (typeof detail === "string" ? detail : null) ||
            `Perfil @${handle} não encontrado.`;
          if (mounted) setError({ kind: "not_found", message });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (mounted) setData(j);
      } catch (e) {
        console.error(e);
        if (mounted)
          setError({
            kind: "network",
            message: "Não foi possível carregar este perfil. Tente novamente.",
          });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [handle]);

  // Share tracking E2E — dispara em /u/<handle>?ref=share (fire-and-forget).
  useEffect(() => {
    if (!handle) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") !== "share") return;
      const key = `lindart.share.tracked.profile.${handle}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch(`${API_BASE}/api/analytics/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "profile", id: handle, ref: "share" }),
      }).catch(() => {});
    } catch {
      /* fire-and-forget */
    }
  }, [handle]);

  if (loading) {
    return (
      <div
        className="max-w-7xl mx-auto px-5 md:px-10 pt-16 pb-20 flex items-center justify-center text-zinc-500"
        data-testid="profile-loading"
      >
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Carregando perfil…
      </div>
    );
  }

  if (!data) {
    const isNotFound = error?.kind === "not_found";
    return (
      <div
        className="max-w-2xl mx-auto px-5 md:px-10 pt-20 pb-24"
        data-testid="profile-not-found"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.9, 0.3, 1] }}
          className="relative rounded-sm border border-gold/25 bg-white/70 backdrop-blur-md shadow-[0_12px_40px_rgba(184,149,74,0.12)] overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 20% 10%, rgba(212,175,55,0.18), transparent 55%), radial-gradient(circle at 85% 90%, rgba(184,149,74,0.14), transparent 60%)",
            }}
          />
          <div className="relative px-7 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-gold/40 bg-white flex items-center justify-center shadow-sm">
              <UserX className="w-7 h-7 text-gold-deep" />
            </div>
            <div className="label-eyebrow text-gold mb-2">
              {isNotFound ? "404 · Perfil" : "Erro ao carregar"}
            </div>
            <h1
              className="font-display text-3xl md:text-4xl text-zinc-900 mb-3 tracking-tight"
              data-testid="profile-not-found-title"
            >
              {isNotFound ? "Perfil não encontrado" : "Algo deu errado"}
            </h1>
            <p className="text-zinc-600 text-sm md:text-[15px] leading-relaxed max-w-md mx-auto mb-2">
              {error?.message ||
                `O handle @${handle} ainda não publicou peças, DNAs ou itens.`}
            </p>
            <p className="text-zinc-500 text-xs mb-8">
              Que tal explorar outros artistas no feed?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="text-[11px] tracking-[0.22em] uppercase bg-gold-deep text-white hover:bg-gold transition-colors px-5 py-2.5 inline-flex items-center gap-2 rounded-sm shadow-sm"
                data-testid="profile-not-found-home"
              >
                <Home className="w-3.5 h-3.5" /> Voltar ao início
              </Link>
              <Link
                to="/feed"
                className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold-deep hover:bg-gold/10 transition-colors px-5 py-2.5 inline-flex items-center gap-2 rounded-sm"
                data-testid="profile-not-found-feed"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Explorar feed
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const { stats, signature_palette, posts, dnas, marketplace, submissions } =
    data;

  const tabs = [
    { id: "posts", label: "Feed", count: stats.posts, icon: ImageIcon },
    { id: "dnas", label: "DNAs", count: stats.dnas, icon: Sparkles },
    {
      id: "marketplace",
      label: "Marketplace",
      count: stats.marketplace_items,
      icon: ShoppingBag,
    },
    {
      id: "submissions",
      label: "Desafios",
      count: stats.challenges,
      icon: Trophy,
    },
  ];

  return (
    <div
      className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-10"
      data-testid="profile-page"
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <Link
          to="/feed"
          className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 hover:text-gold inline-flex items-center gap-1.5 mb-4"
          data-testid="profile-back"
        >
          <ArrowLeft className="w-3 h-3" /> Voltar ao feed
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-5">
          <div>
            <div className="label-eyebrow text-gold mb-1">Artista LindArt</div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
              <span className="italic gold-shimmer">@{data.handle || handle}</span>
            </h1>
            <p className="text-zinc-600 text-sm md:text-base mt-3 italic">
              Portfólio de processos, paletas e peças únicas.
            </p>
            <button
              type="button"
              onClick={() => setProfileShareOpen(true)}
              className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase border border-gold/50 text-gold-deep hover:bg-gold/10 transition-colors px-4 py-2 rounded-sm"
              data-testid="profile-share-button"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar perfil
            </button>
          </div>

          {signature_palette?.length > 0 && (
            <div data-testid="profile-signature-palette">
              <div className="label-eyebrow text-zinc-500 mb-2 text-right">
                Paleta assinatura
              </div>
              <div className="flex gap-1">
                {signature_palette.slice(0, 8).map((c, i) => (
                  <span
                    key={i}
                    title={c}
                    className="w-7 h-7 rounded-sm border border-black/10 shadow-sm"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8"
          data-testid="profile-stats"
        >
          <Stat label="Posts" value={stats.posts} icon={ImageIcon} />
          <Stat label="DNAs" value={stats.dnas} icon={Sparkles} />
          <Stat
            label="Marketplace"
            value={stats.marketplace_items}
            icon={ShoppingBag}
          />
          <Stat label="Desafios" value={stats.challenges} icon={Trophy} />
          <Stat label="Curtidas" value={stats.total_likes} icon={Heart} />
        </div>
      </motion.header>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 border-b border-black/[0.08] overflow-x-auto no-scrollbar"
        data-testid="profile-tabs"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 px-4 py-3 text-[11px] tracking-[0.22em] uppercase inline-flex items-center gap-2 transition-colors ${
                active
                  ? "text-gold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              data-testid={`profile-tab-${t.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span className="text-zinc-400 font-mono">({t.count})</span>
              {active && (
                <motion.span
                  layoutId="profile-tab-underline"
                  className="absolute left-2 right-2 -bottom-px h-px bg-gold"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div data-testid="profile-tab-content">
        {tab === "posts" &&
          (posts?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="group border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors"
                  data-testid={`profile-post-${p.id}`}
                >
                  <img
                    src={p.image_url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-auto object-cover block"
                  />
                  <div className="p-3">
                    <h3 className="text-sm text-zinc-800 leading-tight line-clamp-2 mb-1">
                      {p.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {p.likes || 0}
                      </span>
                      {p.palette_colors?.length > 0 && (
                        <div className="flex gap-0.5">
                          {p.palette_colors.slice(0, 5).map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-[1px] border border-black/10"
                              style={{ background: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSharePost({
                          id: p.id,
                          title: p.title,
                          description: p.description || "",
                        })
                      }
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-zinc-500 hover:text-gold-deep border-t border-black/[0.04] pt-2 transition-colors"
                      data-testid={`post-share-button-${p.id}`}
                    >
                      <Share2 className="w-3 h-3" /> Compartilhar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty message="Ainda sem posts no feed." />
          ))}

        {tab === "dnas" &&
          (dnas?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dnas.map((d) => (
                <Link
                  key={d.id}
                  to={d.path}
                  className="group border border-black/[0.06] bg-ink-surface rounded-sm p-4 hover:border-gold/40 transition-colors"
                  data-testid={`profile-dna-${d.id}`}
                >
                  <div className="label-eyebrow text-gold mb-1">Assinatura de Cor</div>
                  <h3 className="font-display text-lg text-zinc-900 mb-3 line-clamp-2">
                    {d.signature || "Sem assinatura"}
                  </h3>
                  {d.dominant_colors?.length > 0 && (
                    <div className="flex gap-1 mb-3">
                      {d.dominant_colors.map((c, i) => (
                        <span
                          key={i}
                          title={c}
                          className="w-6 h-6 rounded-sm border border-black/10"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  )}
                  {d.mood?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.mood.slice(0, 4).map((m, i) => (
                        <span
                          key={i}
                          className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 px-2 py-0.5 border border-black/[0.08] rounded-sm"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-zinc-400 inline-flex items-center gap-1 group-hover:text-gold">
                    Ver cartão <ExternalLink className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty message="Este artista ainda não criou DNAs públicos." />
          ))}

        {tab === "marketplace" &&
          (marketplace?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {marketplace.map((m) => {
                const price = formatBRL(m.price_brl);
                return (
                  <article
                    key={m.id}
                    className="group border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors"
                    data-testid={`profile-market-${m.id}`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-zinc-100">
                      <img
                        src={m.image_url}
                        alt={m.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm text-zinc-900 leading-tight line-clamp-2 mb-1">
                        {m.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-500">
                          {m.type}
                        </span>
                        {price && (
                          <span className="text-sm font-display text-zinc-900">
                            {price}
                          </span>
                        )}
                      </div>
                      {m.link && (
                        <a
                          href={m.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 w-full text-[10px] tracking-[0.22em] uppercase bg-zinc-900 text-bone hover:bg-zinc-800 px-3 py-2 rounded-sm inline-flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver no site
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty message="Nenhum item no marketplace ainda." />
          ))}

        {tab === "submissions" &&
          (submissions?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="border border-black/[0.06] bg-ink-surface rounded-sm p-4"
                  data-testid={`profile-sub-${s.id}`}
                >
                  <div className="label-eyebrow text-gold mb-1">Desafio</div>
                  <h3 className="text-sm text-zinc-800">
                    {s.title || s.challenge_id || "Submissão"}
                  </h3>
                  {s.image_url && (
                    <img
                      src={s.image_url}
                      alt={s.title}
                      loading="lazy"
                      className="w-full h-auto object-cover mt-3 rounded-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty message="Sem participações em desafios." />
          ))}
      </div>

      <ShareSheet
        open={profileShareOpen}
        onClose={() => setProfileShareOpen(false)}
        url={`${API_BASE}/api/og/profile/${encodeURIComponent(data.handle || handle)}`}
        title={`@${data.handle || handle} — Artista LindArt`}
        description={`Portfólio de @${data.handle || handle} no LindArt.`}
      />

      <ShareSheet
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        url={
          sharePost ? `${API_BASE}/api/og/feed/${sharePost.id}` : ""
        }
        title={sharePost ? `${sharePost.title} — LindArt` : ""}
        description={
          sharePost
            ? sharePost.description || "Post LindArt — paleta, processo e peça."
            : ""
        }
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="border border-black/[0.06] bg-ink-surface rounded-sm px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="font-display text-2xl text-zinc-900">{value || 0}</div>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div
      className="border border-black/[0.06] bg-ink-surface rounded-sm p-10 text-center text-zinc-500 text-sm"
      data-testid="profile-empty"
    >
      {message}
    </div>
  );
}
