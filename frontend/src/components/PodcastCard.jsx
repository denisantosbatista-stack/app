import { Link } from "react-router-dom";
import { Headphones, Clock } from "lucide-react";

function formatDuracao(segundos) {
  const s = Math.max(0, Number(segundos) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h${String(mm).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;

function resolveUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u}`;
}

export default function PodcastCard({ podcast }) {
  if (!podcast) return null;
  const capa = resolveUrl(podcast.capa_url);
  return (
    <Link
      to={`/podcasts/${podcast.id}`}
      className="group block border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors"
      data-testid={`podcast-card-${podcast.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-black">
        {capa ? (
          <img
            src={capa}
            alt={podcast.titulo}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            data-testid={`podcast-card-image-${podcast.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <Headphones className="w-10 h-10" />
          </div>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-gold border border-gold/40 bg-black/40 backdrop-blur px-2 py-0.5 rounded-sm">
          <Headphones className="w-3 h-3" /> Podcast
        </span>
        {podcast.duracao_segundos > 0 && (
          <span
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] text-white bg-black/55 backdrop-blur px-2 py-0.5 rounded-full"
            data-testid={`podcast-card-duration-${podcast.id}`}
          >
            <Clock className="w-3 h-3" />
            {formatDuracao(podcast.duracao_segundos)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3
          className="text-sm text-zinc-800 leading-tight line-clamp-2 mb-1 group-hover:text-gold transition-colors"
          data-testid={`podcast-card-title-${podcast.id}`}
        >
          {podcast.titulo}
        </h3>
        <p className="text-[11px] tracking-[0.16em] uppercase text-zinc-500">
          {podcast.resineira}
        </p>
      </div>
    </Link>
  );
}

export { formatDuracao, resolveUrl };
