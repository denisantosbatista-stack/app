import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareText,
  Gem,
  Copy,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard } from "@/utils/color";
import AIErrorState from "./AIErrorState";
import { chamarIA, ApiError, abrirUpgradePadrao } from "@/utils/api";
import { Field } from "./ui/Field";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "etsy", label: "Etsy" },
];

const TONES = [
  { id: "luxuoso", label: "Luxuoso" },
  { id: "poetico", label: "Poético" },
  { id: "divertido", label: "Divertido" },
  { id: "minimalista", label: "Minimalista" },
];

export default function MarketingPanel({ palette }) {
  const [tab, setTab] = useState("caption");
  return (
    <div
      className="relative rounded-sm border border-black/[0.08] bg-white/60 backdrop-blur-md overflow-hidden"
      data-testid="marketing-panel"
    >
      <div className="px-5 md:px-7 pt-5 pb-3 border-b border-black/[0.06] flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-gold mb-1">Marketing & Avaliação</div>
          <h3 className="font-display text-2xl tracking-tight">
            Eleve a peça <span className="italic gold-shimmer">com IA</span>
          </h3>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-sm bg-black/[0.04]">
          <TabButton
            active={tab === "caption"}
            onClick={() => setTab("caption")}
            icon={MessageSquareText}
            label="Legenda"
            testid="marketing-tab-caption"
          />
          <TabButton
            active={tab === "luxury"}
            onClick={() => setTab("luxury")}
            icon={Gem}
            label="Luxury Score"
            testid="marketing-tab-luxury"
          />
        </div>
      </div>

      <div className="p-5 md:p-7">
        <AnimatePresence mode="wait">
          {tab === "caption" ? (
            <motion.div
              key="caption"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <CaptionTab palette={palette} />
            </motion.div>
          ) : (
            <motion.div
              key="luxury"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <LuxuryTab palette={palette} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs tracking-wide transition-all ${
        active
          ? "bg-ink text-bone shadow-sm"
          : "text-zinc-600 hover:text-ink-text"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ===== CAPTION =====
function CaptionTab({ palette }) {
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("luxuoso");
  const [piece, setPiece] = useState("brinco de resina");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await chamarIA("/ai/generate-caption", {
        palette_name: palette?.name,
        colors: (palette?.colors || []).map((c) =>
          typeof c === "string" ? c : c.hex
        ),
        piece,
        style: palette?.style,
        platform,
        tone,
        language: "pt-BR",
      });
      setResult(data);
      toast.success("Legenda gerada!");
    } catch (e) {
      const erro =
        e instanceof ApiError
          ? { message: e.message, tipo: e.tipo, status: e.status, detail: e.detail }
          : { message: e?.message || "Falha ao gerar legenda", tipo: "servidor" };
      setError(erro);
      const msg =
        erro.tipo === "saldo"
          ? "Saldo de gerações esgotado. Recarregue o Universal Key para continuar."
          : erro.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!result) return;
    const text = `${result.headline}\n\n${result.caption}\n\n${(result.hashtags || []).join(" ")}\n\n${result.cta || ""}`;
    await copyToClipboard(text.trim());
    toast.success("Copiado para área de transferência");
  };

  const copyHashtags = async () => {
    if (!result?.hashtags?.length) return;
    await copyToClipboard(result.hashtags.join(" "));
    toast.success("Hashtags copiadas");
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Plataforma">
          <ChipRow
            options={PLATFORMS}
            value={platform}
            onChange={setPlatform}
            testid="caption-platform"
          />
        </Field>
        <Field label="Tom de voz">
          <ChipRow
            options={TONES}
            value={tone}
            onChange={setTone}
            testid="caption-tone"
          />
        </Field>
        <Field label="Tipo da peça">
          <input
            type="text"
            value={piece}
            onChange={(e) => setPiece(e.target.value)}
            placeholder="brinco, colar, bandeja…"
            className="w-full px-3 py-2 rounded-sm border border-black/[0.1] bg-white text-sm focus:outline-none focus:border-gold transition-colors"
            data-testid="caption-piece-input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={loading || !palette?.colors?.length}
          className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs tracking-[0.18em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="generate-caption-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Gerar Legenda
            </>
          )}
        </button>
        {result && (
          <>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-zinc-300 text-xs tracking-[0.18em] uppercase hover:border-gold hover:bg-gold/5 transition-colors"
              data-testid="copy-caption-btn"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar tudo
            </button>
            <button
              type="button"
              onClick={copyHashtags}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-zinc-300 text-xs tracking-[0.18em] uppercase hover:border-gold hover:bg-gold/5 transition-colors"
              data-testid="copy-hashtags-btn"
            >
              <Copy className="w-3.5 h-3.5" />
              Só hashtags
            </button>
          </>
        )}
      </div>

      {error && (
        <div data-testid="caption-error">
          <AIErrorState erro={error} onRetry={generate} onUpgrade={abrirUpgradePadrao} />
        </div>
      )}

      {result && (
        <div className="space-y-4" data-testid="caption-result">
          {result.headline && (
            <div>
              <div className="label-eyebrow text-zinc-500 mb-1">Headline</div>
              <p className="font-display text-xl leading-snug">
                {result.headline}
              </p>
            </div>
          )}
          <div>
            <div className="label-eyebrow text-zinc-500 mb-1">Legenda</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {result.caption}
            </p>
          </div>
          {result.cta && (
            <div>
              <div className="label-eyebrow text-zinc-500 mb-1">CTA</div>
              <p className="text-sm text-zinc-800">{result.cta}</p>
            </div>
          )}
          {result.hashtags?.length > 0 && (
            <div>
              <div className="label-eyebrow text-zinc-500 mb-2">
                Hashtags ({result.hashtags.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-sm bg-gold/10 text-zinc-800 border border-gold/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.alt_text && (
            <div>
              <div className="label-eyebrow text-zinc-500 mb-1">
                Texto alternativo (acessibilidade)
              </div>
              <p className="text-xs text-zinc-600 italic">{result.alt_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== LUXURY SCORE =====
function LuxuryTab({ palette }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const compute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await chamarIA("/ai/luxury-score", {
        palette_name: palette?.name,
        colors: (palette?.colors || []).map((c) =>
          typeof c === "string" ? c : c.hex
        ),
        style: palette?.style,
        description: palette?.description || "",
      });
      setResult(data);
      toast.success(`Luxury Score: ${data.score}/100 (${data.tier})`);
    } catch (e) {
      const erro =
        e instanceof ApiError
          ? { message: e.message, tipo: e.tipo, status: e.status, detail: e.detail }
          : { message: e?.message || "Falha ao calcular", tipo: "servidor" };
      setError(erro);
      const msg =
        erro.tipo === "saldo"
          ? "Saldo de gerações esgotado. Recarregue o Universal Key para continuar."
          : erro.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600 max-w-2xl">
        Avaliamos a paleta em <strong>contraste</strong>,{" "}
        <strong>harmonia</strong>, <strong>profundidade</strong> e{" "}
        <strong>sofisticação</strong>. A IA conclui com um parecer e sugestões
        práticas para elevar o luxo.
      </p>

      <button
        type="button"
        onClick={compute}
        disabled={loading || !palette?.colors?.length}
        className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs tracking-[0.18em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="compute-luxury-btn"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Calculando…
          </>
        ) : (
          <>
            <Gem className="w-3.5 h-3.5" />
            Avaliar Luxo
          </>
        )}
      </button>

      {error && (
        <div data-testid="luxury-error">
          <AIErrorState erro={error} onRetry={compute} onUpgrade={abrirUpgradePadrao} />
        </div>
      )}

      {result && (
        <div className="grid md:grid-cols-2 gap-6" data-testid="luxury-result">
          <ScoreGauge score={result.score} tier={result.tier} />
          <div className="space-y-4">
            <Metrics metrics={result.metrics || {}} />
            {result.verdict && (
              <div>
                <div className="label-eyebrow text-zinc-500 mb-1">Parecer</div>
                <p className="text-sm leading-relaxed text-zinc-800">
                  {result.verdict}
                </p>
              </div>
            )}
            {result.suggestions?.length > 0 && (
              <div>
                <div className="label-eyebrow text-zinc-500 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Sugestões
                </div>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-zinc-700 pl-3 border-l-2 border-gold/40"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, tier }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - pct / 100);
  return (
    <div
      className="flex flex-col items-center justify-center py-4"
      data-testid="luxury-score-gauge"
    >
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="6"
            fill="none"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#gold-grad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#8c6a1f" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-4xl tracking-tight"
            data-testid="luxury-score-value"
          >
            {pct}
          </span>
          <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
            de 100
          </span>
        </div>
      </div>
      <div
        className="mt-3 px-3 py-1 rounded-sm bg-ink text-bone text-[10px] tracking-[0.22em] uppercase"
        data-testid="luxury-tier"
      >
        Tier {tier}
      </div>
    </div>
  );
}

function Metrics({ metrics }) {
  const rows = [
    { key: "contrast", label: "Contraste" },
    { key: "harmony", label: "Harmonia" },
    { key: "depth", label: "Profundidade" },
    { key: "sophistication", label: "Sofisticação" },
  ];
  return (
    <div className="space-y-2.5" data-testid="luxury-metrics">
      {rows.map((r) => {
        const v = Math.max(0, Math.min(100, metrics[r.key] || 0));
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="tracking-wider uppercase text-zinc-600">
                {r.label}
              </span>
              <span className="font-mono text-zinc-800">{v}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gold-hover to-gold-deep"
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Shared =====
// Field component centralized in /components/ui/Field.jsx

function ChipRow({ options, value, onChange, testid }) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          data-testid={`${testid}-${o.id}`}
          className={`px-2.5 py-1 rounded-sm text-xs tracking-wide transition-colors border ${
            value === o.id
              ? "bg-ink text-bone border-ink"
              : "bg-white border-zinc-300 text-zinc-700 hover:border-gold"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
