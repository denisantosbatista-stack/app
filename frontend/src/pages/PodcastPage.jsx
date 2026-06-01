import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, ArrowLeft, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import PodcastCard, { resolveUrl, formatDuracao } from "../components/PodcastCard";

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;

function useDebounced(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function PodcastPage() {
  const { id } = useParams();
  return id ? <PodcastDetail id={id} /> : <PodcastListView />;
}

function PodcastListView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 400);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = new URL(`${API_BASE}/api/podcasts`);
        url.searchParams.set("limit", "60");
        if (debounced.trim()) url.searchParams.set("q", debounced.trim());
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error("Não foi possível carregar os podcasts");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div
      className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16"
      data-testid="podcasts-page"
    >
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="label-eyebrow text-gold mb-3 inline-flex items-center gap-2">
          <Headphones className="w-3.5 h-3.5" /> Resineiras em conversa
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Histórias de quem cria <span className="italic gold-shimmer">com resina</span>
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
          Episódios curtos com artistas, processos e bastidores do ateliê.
        </p>
      </motion.header>

      <div className="mb-8 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, resineira ou tema…"
          className="w-full bg-ink-surface border border-black/[0.08] rounded-sm pl-10 pr-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-gold/60 transition-colors"
          data-testid="podcasts-search-input"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="podcasts-loading">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-ink-surface border border-black/[0.06] rounded-sm animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="border border-black/[0.06] bg-ink-surface rounded-sm p-12 text-center"
          data-testid="podcasts-empty"
        >
          <Headphones className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
          <h3 className="font-display text-xl text-zinc-800 mb-2">Nenhum episódio encontrado</h3>
          <p className="text-zinc-600 text-sm max-w-md mx-auto">
            {debounced
              ? `Nada por aqui para “${debounced}”. Tente outra busca.`
              : "Ainda não há episódios publicados. Volte em breve."}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          data-testid="podcasts-grid"
        >
          {items.map((p) => (
            <PodcastCard key={p.id} podcast={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PodcastDetail({ id }) {
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound | error
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/podcasts/${id}`);
        if (res.status === 404) {
          if (!cancelled) setStatus("notfound");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setPodcast(data);
          setStatus("ok");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const audioUrl = useMemo(() => (podcast ? resolveUrl(podcast.audio_url) : ""), [podcast]);
  const capaUrl = useMemo(() => (podcast ? resolveUrl(podcast.capa_url) : ""), [podcast]);

  if (status === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-5 md:px-10 pt-12 pb-16" data-testid="podcast-detail-loading">
        <div className="aspect-[16/9] bg-ink-surface border border-black/[0.06] rounded-sm animate-pulse mb-6" />
        <div className="h-8 w-2/3 bg-ink-surface rounded-sm animate-pulse mb-3" />
        <div className="h-4 w-1/3 bg-ink-surface rounded-sm animate-pulse" />
      </div>
    );
  }

  if (status === "notfound" || status === "error") {
    return (
      <div
        className="max-w-4xl mx-auto px-5 md:px-10 pt-16 pb-16 text-center"
        data-testid="podcast-detail-notfound"
      >
        <Headphones className="w-10 h-10 mx-auto text-zinc-400 mb-4" />
        <h1 className="font-display text-3xl mb-2">Episódio não encontrado</h1>
        <p className="text-zinc-600 text-sm mb-6">
          O podcast que você procura não existe ou ainda não foi publicado.
        </p>
        <button
          onClick={() => navigate("/podcasts")}
          className="text-[11px] tracking-[0.22em] uppercase border border-gold/60 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-sm inline-flex items-center gap-2"
          data-testid="podcast-detail-back-list"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Ver todos os episódios
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16" data-testid="podcast-detail-page">
      <Link
        to="/podcasts"
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-zinc-500 hover:text-gold mb-6"
        data-testid="podcast-detail-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Todos os episódios
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-10 mb-8"
      >
        <div className="aspect-square overflow-hidden bg-black border border-black/[0.06] rounded-sm">
          {capaUrl ? (
            <img
              src={capaUrl}
              alt={podcast.titulo}
              className="w-full h-full object-cover"
              data-testid="podcast-detail-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <Headphones className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="label-eyebrow text-gold mb-3 inline-flex items-center gap-2">
            <Headphones className="w-3.5 h-3.5" /> Resineiras em conversa
          </div>
          <h1
            className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] mb-3"
            data-testid="podcast-detail-title"
          >
            {podcast.titulo}
          </h1>
          <p
            className="text-sm tracking-[0.16em] uppercase text-zinc-600 mb-4"
            data-testid="podcast-detail-resineira"
          >
            com {podcast.resineira}
          </p>
          {podcast.duracao_segundos > 0 && (
            <p className="text-xs text-zinc-500 mb-4">
              Duração: {formatDuracao(podcast.duracao_segundos)}
            </p>
          )}
          {Array.isArray(podcast.tags) && podcast.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {podcast.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] tracking-[0.18em] uppercase text-zinc-600 border border-black/[0.08] px-2 py-0.5 rounded-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="mb-8" data-testid="podcast-detail-player-wrap">
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          src={audioUrl}
          className="w-full"
          data-testid="podcast-detail-player"
        >
          Seu navegador não suporta o player de áudio.
        </audio>
      </div>

      {podcast.descricao && (
        <article
          className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed whitespace-pre-line"
          data-testid="podcast-detail-description"
        >
          {podcast.descricao}
        </article>
      )}
    </div>
  );
}
