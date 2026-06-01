import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, Flame, Copy, Loader2, Sparkles, Beaker } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);
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
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [focus, setFocus] = useState("geral");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeTrend, setRecipeTrend] = useState(null);
  const savePalette = usePaletteStore((s) => s.savePalette);

  function copyHex(hex) {
    navigator.clipboard.writeText(hex);
    toast.success(`${hex.toUpperCase()} copiado`);
  }

  function openRecipe(t) {
    setRecipeTrend(t);
    setRecipeOpen(true);
  }

  async function fetchTrends({ refresh = false, currentFocus = focus } = {}) {
    setLoading(true);
    setRetryAttempt(0);
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 2000;
    let lastError = null;
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setRetryAttempt(attempt);
        try {
          const res = await fetch(`${API_BASE}/api/ai/trends`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh, focus: currentFocus }),
          });
          if (res.status === 503) {
            lastError = new Error("Servidor acordando (503)");
            if (attempt < MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
              continue;
            }
            throw lastError;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const j = await res.json();
          setData(j);
          saveCache(j);
          return;
        } catch (innerErr) {
          if (innerErr?.message !== "Servidor acordando (503)") throw innerErr;
          lastError = innerErr;
        }
      }
      throw lastError || new Error("Falha ao carregar tendências");
    } catch (e) {
      toast.error("Não foi possível carregar as tendências");
      console.error(e);
    } finally {
      setLoading(false);
      setRetryAttempt(0);
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
        <div data-testid="trends-loading">
          <div
            className="flex items-center justify-center gap-2 text-xs tracking-[0.22em] uppercase text-zinc-500 mb-6"
            role="status"
            aria-live="polite"
            data-testid="trends-loading-text"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
            {retryAttempt > 1
              ? `Servidor acordando… (tentativa ${retryAttempt}/3)`
              : "Carregando tendências..."}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-ink-surface border border-black/[0.06] rounded-sm overflow-hidden"
                data-testid="trend-skeleton"
              >
                <div className="h-28 flex">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex-1 skeleton" />
                  ))}
                </div>
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 skeleton rounded-sm" />
                  <div className="h-3 w-full skeleton rounded-sm" />
                  <div className="h-3 w-5/6 skeleton rounded-sm" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-4 w-12 skeleton rounded-sm" />
                    <div className="h-4 w-16 skeleton rounded-sm" />
                    <div className="h-4 w-10 skeleton rounded-sm" />
                  </div>
                  <div className="h-8 w-full skeleton rounded-sm mt-2" />
                </div>
              </div>
            ))}
          </div>
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
                      className="text-[10px] tracking-[0.08em] text-zinc-600 bg-gold/5 border border-gold/20 px-2.5 py-1 rounded-full"
                      data-testid="trend-tag-pill"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5" data-testid="trend-swatches">
                  {(t.colors || []).map((c) => (
                    <button
                      key={c}
                      onClick={() => copyHex(c)}
                      title={`Copiar ${c.toUpperCase()}`}
                      style={{ background: c }}
                      className="w-7 h-7 rounded-full border border-black/10 shadow-sm hover:scale-110 transition-transform cursor-pointer"
                      data-testid={`trend-swatch-${c.replace('#','')}`}
                      aria-label={`Copiar cor ${c}`}
                    />
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
                    onClick={() => openRecipe(t)}
                    className="px-3 py-2 rounded-sm border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                    title="Como fazer esta cor"
                    data-testid="trend-recipe-btn"
                  >
                    <Beaker className="w-3 h-3" /> Como fazer esta cor
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
      {!loading && data && (!data.trends || data.trends.length === 0) && (
        <div
          className="text-center py-12 border border-dashed border-black/[0.08] rounded-sm"
          data-testid="trends-empty"
        >
          <p className="text-sm text-zinc-600 mb-4">
            Nenhuma tendência encontrada para este foco no momento.
          </p>
          <button
            onClick={() => fetchTrends({ refresh: true })}
            className="text-[10px] tracking-[0.22em] uppercase text-gold hover:underline inline-flex items-center gap-1.5"
            data-testid="trends-empty-retry"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      )}
      {loading && data && (
        <div className="mt-4 text-center text-xs text-zinc-500 inline-flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-gold" /> Atualizando curadoria…
        </div>
      )}

      {/* Recipe modal — "Como fazer esta cor" */}
      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent
          className="bg-ink-surface border border-gold/30 max-w-xl text-zinc-800"
          data-testid="trend-recipe-modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight text-zinc-900">
              {recipeTrend?.name || "Como fazer esta cor"}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 italic">
              {recipeTrend?.tagline || "Receita visual da paleta"}
            </DialogDescription>
          </DialogHeader>
          {recipeTrend && (
            <div className="space-y-5">
              {/* Color stripe */}
              <div className="h-24 flex rounded-sm overflow-hidden border border-black/[0.06]">
                {(recipeTrend.colors || []).map((c) => (
                  <div key={c} style={{ background: c }} className="flex-1" />
                ))}
              </div>

              {/* Recipe by color */}
              <div>
                <div className="label-eyebrow text-gold mb-3">Receita por cor</div>
                <ul className="space-y-2" data-testid="trend-recipe-list">
                  {(recipeTrend.colors || []).map((c, idx) => {
                    const pct = Math.round(100 / Math.max((recipeTrend.colors || []).length, 1));
                    return (
                      <li key={c} className="flex items-center gap-3 text-sm">
                        <span
                          style={{ background: c }}
                          className="w-9 h-9 rounded-full border border-black/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-zinc-800">
                            <span className="font-medium">Cor {idx + 1}</span>
                            <span className="font-mono text-xs text-zinc-500">{c.toUpperCase()}</span>
                          </div>
                          <div className="text-xs text-zinc-500 leading-relaxed">
                            ~{pct}% da mistura · 2–3 gotas de pigmento por 50&nbsp;ml de resina
                          </div>
                        </div>
                        <button
                          onClick={() => copyHex(c)}
                          className="text-[10px] tracking-[0.18em] uppercase text-zinc-600 hover:text-gold inline-flex items-center gap-1"
                          data-testid={`trend-recipe-copy-${c.replace('#','')}`}
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Tips */}
              <div className="rounded-sm border border-gold/20 bg-gold/5 p-4 text-xs text-zinc-700 leading-relaxed">
                <div className="label-eyebrow text-gold mb-2">Dicas de aplicação</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Pese a resina e o catalisador em proporção 2:1 (ou conforme fabricante).</li>
                  <li>Adicione o pigmento antes de unir as partes para evitar bolhas.</li>
                  <li>Para efeitos marmorizados, despeje as cores em camadas e mexa apenas a superfície.</li>
                  <li>Cure por 24h a 25°C antes de desmoldar.</li>
                </ul>
              </div>

              {/* Tags */}
              {recipeTrend.tags && recipeTrend.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recipeTrend.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] tracking-[0.08em] text-zinc-600 bg-gold/5 border border-gold/20 px-2.5 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => copyColors(recipeTrend.colors)}
                  className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                  data-testid="trend-recipe-copy-all"
                >
                  <Copy className="w-3 h-3" /> Copiar paleta
                </button>
                <button
                  onClick={() => {
                    saveAsPalette(recipeTrend);
                    setRecipeOpen(false);
                  }}
                  className="btn-gold px-3 py-2 rounded-sm text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                  data-testid="trend-recipe-save"
                >
                  <Sparkles className="w-3 h-3" /> Salvar paleta
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
