import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, Flame, Copy, Loader2, Sparkles, Beaker, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";
import ShareSheet from "@/components/ShareSheet";
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

// ── Receita real por família de cor (pigmentação para resina epóxi) ──
function hexToHsl(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return { h: hue, s: s * 100, l: l * 100 };
}

function classifyColor(hex) {
  const hsl = hexToHsl(hex);
  if (!hsl) return "neutro";
  const { h, s, l } = hsl;
  if (l > 90) return "branco";
  if (l < 15) return "preto";
  if (s < 20) return "neutro";
  if (h >= 280 && h <= 360 && s >= 20 && s <= 60 && l >= 60 && l <= 85) return "pastel-rosa";
  if (h >= 40 && h <= 60 && s > 40) return "dourado";
  if (h >= 10 && h < 40 && s > 40) return "laranja";
  if ((h >= 340 || h < 10) && s > 40) return "vermelho";
  if (h >= 260 && h < 300 && s > 30) return "roxo";
  if (h >= 180 && h < 240 && s > 30) return "azul";
  if (h >= 100 && h < 160 && s > 30) return "verde";
  return "neutro";
}

const RECIPES = {
  branco: {
    nome: "Branco translúcido",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento branco titânio 2–3%", "Mica pérola 1% (opcional para brilho)"],
    proporcao: "Máx 3% de pigmento total — excesso opacifica e interfere na cura",
    tecnica: "Adicione pigmento branco aos poucos — pequenas doses controlam a opacidade",
    aviso: "Pigmento branco em excesso pode inibir a cura da resina",
  },
  preto: {
    nome: "Preto profundo",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento preto intenso 1–2%"],
    proporcao: "Máx 2% — preto é muito concentrado, pouco já cobre",
    tecnica: "Use conta-gotas. 1 gota por 100ml já cria efeito translúcido profundo",
    aviso: "Preto em excesso bloqueia a foto-iniciação em resinas UV",
  },
  dourado: {
    nome: "Dourado · amarelo quente",
    base: "Resina cristalina transparente",
    pigmentos: ["Mica dourada 2–4%", "Pigmento amarelo ouro 1% (para saturação)"],
    proporcao: "2–4% de mica dourada · misturar devagar para não criar grumos",
    tecnica: "Adicione a mica dourada por último, após misturar os demais componentes",
    aviso: "Micas metálicas podem sedimentar — verta rápido após misturar",
  },
  laranja: {
    nome: "Laranja · coral · terracota",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento laranja queimado 2–3%", "Toque de vermelho 0.5% para profundidade"],
    proporcao: "2–3% total · testar em 10ml antes de escalar",
    tecnica: "Misture laranja com o endurecedor antes de combinar com a resina",
    aviso: "Tons quentes amarelecem mais sob luz UV — use resina com filtro UV",
  },
  vermelho: {
    nome: "Vermelho · rosa quente",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento vermelho carmim 2–3%", "Mica rosê 1% para suavizar"],
    proporcao: "2–3% total",
    tecnica: "Vermelho puro pode virar marrom com certos endurecedores — teste antes",
    aviso: "Pigmentos vermelhos orgânicos podem reagir com resinas ácidas",
  },
  "pastel-rosa": {
    nome: "Rosa · lilás pastel",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento rosa quartzo 1–2%", "Mica pérola 1% para luminosidade"],
    proporcao: "1–2% total · tons pastéis pedem pouco pigmento",
    tecnica: "Menos é mais — adicione 0.5% por vez até atingir o tom desejado",
    aviso: null,
  },
  roxo: {
    nome: "Roxo · ametista",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento violeta 2–3%", "Mica lilás 1% para translucidez"],
    proporcao: "2–3% total",
    tecnica: "Roxo profundo: use base translúcida para criar efeito de profundidade em camadas",
    aviso: null,
  },
  azul: {
    nome: "Azul · celeste",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento azul cobalto 2–3%", "Mica azul gelo 1% para brilho"],
    proporcao: "2–3% total",
    tecnica: "Movimentos circulares lentos para efeito marmóreo natural",
    aviso: null,
  },
  verde: {
    nome: "Verde · esmeralda",
    base: "Resina cristalina transparente",
    pigmentos: ["Pigmento verde esmeralda 2–3%", "Toque de amarelo 0.5% para vibrância"],
    proporcao: "2–3% total",
    tecnica: "Verde + camadas translúcidas criam efeito de profundidade tipo malaquita",
    aviso: null,
  },
  neutro: {
    nome: "Neutro · cinza · prata",
    base: "Resina cristalina transparente",
    pigmentos: ["Mica prata 2–3%", "Pigmento cinza 0.5% para profundidade"],
    proporcao: "2–3% de mica · cinza puro: adicionar 0.5% de preto + branco separadamente",
    tecnica: "Micas metálicas criam efeito espelho em superfícies polidas",
    aviso: "Micas sedimentam — verta imediatamente após misturar",
  },
};

function getReceitaCor(hex) {
  const family = classifyColor(hex);
  const data = RECIPES[family] || RECIPES.neutro;
  return { family, ...data };
}

const BASE_COMUM =
  "Resina cristalina transparente como base — aplique o pigmento após misturar resina e endurecedor.";

function buildRecipeText(trend) {
  if (!trend) return "";
  const lines = [];
  lines.push(`Receita — ${trend.name || "Paleta"}`);
  if (trend.tagline) lines.push(trend.tagline);
  lines.push("");
  lines.push(`Base: ${BASE_COMUM}`);
  lines.push("");
  (trend.colors || []).forEach((c, idx) => {
    const r = getReceitaCor(c);
    lines.push(`Cor ${idx + 1} — ${c.toUpperCase()} · ${r.nome}`);
    lines.push("Pigmentos:");
    r.pigmentos.forEach((p) => lines.push(`  • ${p}`));
    lines.push(`Proporção: ${r.proporcao}`);
    lines.push(`Técnica: ${r.tecnica}`);
    if (r.aviso) lines.push(`Atenção: ${r.aviso}`);
    lines.push("");
  });
  return lines.join("\n");
}


export default function Trends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [focus, setFocus] = useState("geral");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeTrend, setRecipeTrend] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const savePalette = usePaletteStore((s) => s.savePalette);

  // Slug ASCII kebab espelhando `_slugify_trend` no backend (routers/og.py).
  function slugifyTrend(name) {
    if (!name) return "";
    return String(name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80);
  }

  // URL pública de share — aponta para o OG endpoint que serve metatags
  // (crawlers) e redireciona humanos para `/trends?paleta={slug}&ref=share`.
  const recipeShareUrl = recipeTrend
    ? `${API_BASE}/api/og/trend/${slugifyTrend(recipeTrend.id || recipeTrend.name)}`
    : "";

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

              {/* Base comum */}
              <div
                className="rounded-sm border border-gold/20 bg-gold/5 p-4 text-xs text-zinc-700 leading-relaxed"
                data-testid="trend-recipe-base"
              >
                <div className="label-eyebrow text-gold mb-1">Base</div>
                {BASE_COMUM}
              </div>

              {/* Recipe by color — receita real por família */}
              <div>
                <div className="label-eyebrow text-gold mb-3">Receita por cor</div>
                <ul className="space-y-4" data-testid="trend-recipe-list">
                  {(recipeTrend.colors || []).map((c, idx) => {
                    const r = getReceitaCor(c);
                    return (
                      <li
                        key={c}
                        className="rounded-sm border border-black/[0.06] bg-white/40 p-3"
                        data-testid={`trend-recipe-item-${c.replace("#", "")}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            style={{ background: c }}
                            className="w-6 h-6 rounded-full border border-black/10 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-medium text-zinc-900">{r.nome}</span>
                              <span className="font-mono text-[11px] text-zinc-500">
                                {c.toUpperCase()}
                              </span>
                              <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">
                                Cor {idx + 1}
                              </span>
                            </div>

                            <div className="mb-2">
                              <div className="text-[10px] tracking-[0.18em] uppercase text-gold mb-1">
                                Pigmentos
                              </div>
                              <ul className="list-disc pl-4 text-xs text-zinc-700 space-y-0.5">
                                {r.pigmentos.map((p) => (
                                  <li key={p}>{p}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="mb-2">
                              <div className="text-[10px] tracking-[0.18em] uppercase text-gold mb-1">
                                Proporção
                              </div>
                              <div className="text-xs text-zinc-700">{r.proporcao}</div>
                            </div>

                            <div className="mb-2">
                              <div className="text-[10px] tracking-[0.18em] uppercase text-gold mb-1">
                                Técnica
                              </div>
                              <div className="text-xs italic text-zinc-600 leading-relaxed">
                                {r.tecnica}
                              </div>
                            </div>

                            {r.aviso && (
                              <div
                                className="mt-2 rounded-sm border border-amber-300/60 bg-amber-100/60 px-3 py-2 text-xs text-amber-900 leading-relaxed flex items-start gap-2"
                                data-testid={`trend-recipe-warning-${c.replace("#", "")}`}
                              >
                                <span aria-hidden="true">⚠</span>
                                <span>
                                  <span className="font-medium">Atenção:</span> {r.aviso}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => copyHex(c)}
                            className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 hover:text-gold inline-flex items-center gap-1 shrink-0"
                            data-testid={`trend-recipe-copy-${c.replace("#", "")}`}
                          >
                            <Copy className="w-3 h-3" /> Hex
                          </button>
                        </div>
                      </li>
                    );
                  })}
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

              <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => {
                    const txt = buildRecipeText(recipeTrend);
                    navigator.clipboard.writeText(txt);
                    toast.success("Receita copiada");
                  }}
                  className="px-3 py-2 rounded-sm border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                  data-testid="trend-recipe-copy-recipe"
                >
                  <Copy className="w-3 h-3" /> Copiar receita
                </button>
                <button
                  onClick={() => copyColors(recipeTrend.colors)}
                  className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                  data-testid="trend-recipe-copy-all"
                >
                  <Copy className="w-3 h-3" /> Copiar paleta
                </button>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1"
                  data-testid="trend-recipe-share"
                  aria-label="Compartilhar receita"
                >
                  <Share2 className="w-3 h-3" /> Compartilhar receita 🔗
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
                <button
                  onClick={() => setRecipeOpen(false)}
                  className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-zinc-400 transition-colors text-[10px] tracking-[0.18em] uppercase"
                  data-testid="trend-recipe-close"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={recipeShareUrl}
        title={recipeTrend ? `${recipeTrend.name} · Tendência em resina` : "Tendência em resina"}
        description={
          recipeTrend
            ? (recipeTrend.tagline || "Receita visual da paleta") +
              (recipeTrend.colors?.length ? " · " + recipeTrend.colors.join(" ") : "")
            : "Veja esta receita de paleta em resina no LindArt."
        }
      />
    </div>
  );
}
