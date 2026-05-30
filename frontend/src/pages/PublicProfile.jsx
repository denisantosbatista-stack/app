import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Heart,
  Image as ImageIcon,
  ShoppingBag,
  Sparkles,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

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
  const [tab, setTab] = useState("posts");

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/profile/${encodeURIComponent(handle)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (mounted) setData(j);
      } catch (e) {
        console.error(e);
        toast.error("Perfil não encontrado");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      mounted = false;
    };
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
    return (
      <div
        className="max-w-3xl mx-auto px-5 md:px-10 pt-16 pb-20 text-center"
        data-testid="profile-not-found"
      >
        <h1 className="font-display text-3xl text-zinc-900 mb-3">
          Artista não encontrado
        </h1>
        <p className="text-zinc-600 text-sm mb-6">
          O handle <span className="font-mono">@{handle}</span> não tem peças
          publicadas ainda.
        </p>
        <Link
          to="/feed"
          className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-5 py-2.5 inline-flex items-center gap-2 rounded-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao feed
        </Link>
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
                  <div className="label-eyebrow text-gold mb-1">DNA Visual</div>
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
