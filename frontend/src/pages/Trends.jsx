import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, Flame, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "lindart.trends.v1";

const FOCUS_OPTIONS = [
  { id: "geral", label: "Geral" },
  { id: "joalheria", label: "Joalheria" },
  { id: "decoracao", label: "Decoração" },
  { id: "verao", label: "Verão" },
  { id: "minimalista", label: "Minimalista" },
];

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.cached_at || 0) > 1000 * 60 * 60 * 12) return null; // 12h client cache
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cached_at: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

export default function Trends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState("geral");
  const savePalette = usePaletteStore((s) => s.savePalette);

  async function fetchTrends({ refresh = false, currentFocus = focus } = {}) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh, focus: currentFocus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
      saveCache(j);
    } catch (e) {
      toast.error("Não foi possível carregar as tendências");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = loadCache();
    if (cached) setData(cached);
    else fetchTrends({ refresh: false, currentFocus: "geral" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyColors(colors) {
    navigator.clipboard.writeText(colors.join(", "));
    toast.success("Paleta copiada!");
  }

  async function saveAsPalette(t) {
    try {
      await savePalette({
        name: t.name,
        description: t.tagline || "",
        colors: t.colors,
        style: t.style || "luxo",
        tags: t.tags || [],
        favorite: false,
        source: "ai_trend",
      });
      toast.success(`"${t.name}" salva na biblioteca`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-6" data-testid="trends-page">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="label-eyebrow text-gold flex items-center gap-2">
            <Flame className="w-3.5 h-3.5" /> Em alta agora
          </div>
          <button
            onClick={() => fetchTrends({ refresh: true })}
            disabled={loading}
            className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 hover:text-gold inline-flex items-center gap-1.5 disabled:opacity-50"
            data-testid="trends-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando…" : "Atualizar curadoria"}
          </button>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Tendências da <span className="italic gold-shimmer">Semana</span>
        </h1>
        {data?.week_theme && (
          <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
            “{data.week_theme}”
          </p>
        )}
      </motion.header>

      {/* Focus tabs */}
      <div
        className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1 snap-x snap-mandatory md:flex-wrap md:overflow-visible md:mx-0 md:px-0 md:pb-0"
        data-testid="trends-focus-tabs"
      >
        {FOCUS_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFocus(f.id);
              fetchTrends({ refresh: false, currentFocus: f.id });
            }}
            disabled={loading}
            className={`shrink-0 snap-start whitespace-nowrap text-xs px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-[0.18em] ${
              focus === f.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-black/[0.08] bg-ink-surface text-zinc-600 hover:border-gold/50"
            }`}
            data-testid={`trends-focus-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && !data && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-ink-surface border border-black/[0.06] rounded-sm h-80 skeleton" />
          ))}
        </div>
      )}
      {data?.trends && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.trends.map((t, i) => (
            <motion.article
              key={`${t.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="bg-ink-surface border border-black/[0.06] rounded-sm overflow-hidden hover:border-gold/40 transition-colors group"
              data-testid="trend-card"
            >
              {/* Color stripe */}
              <div className="h-28 flex">
                {(t.colors || []).map((c) => (
                  <div key={c} style={{ background: c }} className="flex-1" />
                ))}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-xl tracking-tight leading-tight">{t.name}</h3>
                  {typeof t.viral_score === "number" && (
                    <span className="shrink-0 text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-sm bg-gold/10 text-gold border border-gold/30 inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {t.viral_score}
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed mb-3">{t.tagline}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(t.tags || []).slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] tracking-[0.12em] uppercase text-zinc-500 bg-ink/40 border border-black/[0.06] px-2 py-0.5 rounded-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  {(t.colors || []).map((c) => (
                    <span key={c}>{c.toUpperCase()}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => saveAsPalette(t)}
                    className="btn-gold px-3 py-2 rounded-sm text-[10px] tracking-[0.18em] uppercase flex-1 inline-flex items-center justify-center gap-1"
                    data-testid="trend-save"
                  >
                    <Sparkles className="w-3 h-3" /> Salvar
                  </button>
                  <button
                    onClick={() => copyColors(t.colors)}
                    className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors"
                    title="Copiar cores"
                    data-testid="trend-copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      {loading && data && (
        <div className="mt-4 text-center text-xs text-zinc-500 inline-flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-gold" /> Atualizando curadoria…
        </div>
      )}
    </div>
  );
}
