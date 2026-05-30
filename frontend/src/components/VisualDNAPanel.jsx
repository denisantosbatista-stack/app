import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Loader2, Sparkles, ChevronDown, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import DNAShareModal from "./DNAShareModal";
import AIErrorState from "./AIErrorState";
import { chamarIA, ApiError, abrirUpgradePadrao } from "@/utils/api";

export default function VisualDNAPanel({ palettes, onUseNextPalette }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dna, setDna] = useState(null);
  const [error, setError] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const analyze = async () => {
    if (!palettes?.length) {
      toast.error("Salve ao menos 1 paleta para gerar sua Assinatura de Cor");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = {
        palettes: palettes.map((p) => ({
          name: p.name,
          colors: (p.colors || []).map((c) =>
            typeof c === "string" ? c : c.hex
          ),
          style: p.style,
          tags: p.tags,
          favorite: !!p.favorite,
        })),
      };
      const data = await chamarIA("/ai/visual-dna", body);
      setDna(data);
      setOpen(true);
      toast.success("Assinatura de Cor decifrada");
    } catch (e) {
      const erro =
        e instanceof ApiError
          ? { message: e.message, tipo: e.tipo, status: e.status, detail: e.detail }
          : { message: e?.message || "Falha ao analisar", tipo: "servidor" };
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
    <div
      className="relative rounded-sm border border-black/[0.08] bg-gradient-to-br from-bone via-white to-bone-warm overflow-hidden mb-8"
      data-testid="visual-dna-panel"
    >
      <button
        type="button"
        onClick={() => (dna ? setOpen((v) => !v) : analyze())}
        className="w-full flex items-center justify-between gap-4 px-5 md:px-7 py-5 text-left hover:bg-black/[0.02] transition-colors"
        data-testid="visual-dna-toggle"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-ink text-gold flex items-center justify-center">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="label-eyebrow text-gold mb-0.5">Assinatura de Cor</div>
            <h3 className="font-display text-xl tracking-tight">
              {dna ? "Sua linguagem estética" : "Decifre sua linguagem visual"}
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              {dna
                ? `${dna.stats?.palettes || 0} ${(dna.stats?.palettes || 0) === 1 ? "paleta analisada" : "paletas analisadas"} · luxo médio ${dna.avg?.luxury || 0}/100`
                : "Analisamos suas paletas salvas e revelamos sua assinatura cromática com IA."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gold" />
          ) : !dna ? (
            <span className="hidden sm:inline-flex btn-gold items-center gap-2 px-4 py-2 rounded-sm text-[10px] tracking-[0.18em] uppercase">
              <Sparkles className="w-3 h-3" /> Gerar
            </span>
          ) : (
            <ChevronDown
              className={`w-5 h-5 text-zinc-500 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && dna && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-black/[0.06]"
          >
            <div className="p-5 md:p-7 space-y-6" data-testid="visual-dna-result">
              <div>
                <div className="label-eyebrow text-zinc-500 mb-1">
                  Assinatura
                </div>
                <p className="font-display text-xl leading-snug text-ink-text">
                  {dna.signature}
                </p>
              </div>

              {dna.mood?.length > 0 && (
                <div>
                  <div className="label-eyebrow text-zinc-500 mb-2">Mood</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.mood.map((m, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-sm bg-ink text-bone tracking-wide"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {dna.dominant?.length > 0 && (
                  <div>
                    <div className="label-eyebrow text-zinc-500 mb-2">
                      Cores dominantes
                    </div>
                    <div
                      className="grid grid-cols-6 gap-1"
                      data-testid="visual-dna-dominant"
                    >
                      {dna.dominant.map((c, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div
                            className="w-full aspect-square rounded-sm border border-black/10"
                            style={{ background: c.hex }}
                            title={`${c.hex} · ${Math.round((c.weight || 0) * 100)}%`}
                          />
                          <span className="text-[9px] font-mono text-zinc-500 mt-1">
                            {c.hex}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dna.avg && (
                  <div>
                    <div className="label-eyebrow text-zinc-500 mb-2">
                      Médias do seu acervo
                    </div>
                    <DNAMetrics avg={dna.avg} />
                  </div>
                )}
              </div>

              {dna.style_breakdown?.length > 0 && (
                <div>
                  <div className="label-eyebrow text-zinc-500 mb-2">
                    Estilos recorrentes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.style_breakdown.map((s, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-sm border border-zinc-300 text-zinc-700"
                      >
                        {s.style} · {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dna.recommendations?.length > 0 && (
                <div>
                  <div className="label-eyebrow text-zinc-500 mb-2">
                    Para evoluir
                  </div>
                  <ul className="space-y-1.5">
                    {dna.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="text-sm text-zinc-700 pl-3 border-l-2 border-gold/40"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dna.next_palette?.length > 0 && (
                <div className="pt-2 border-t border-black/[0.06]">
                  <div className="label-eyebrow text-zinc-500 mb-2">
                    Próxima paleta sugerida pelo seu DNA
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex">
                      {dna.next_palette.map((hex, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 border border-black/10 first:rounded-l-sm last:rounded-r-sm"
                          style={{ background: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                    {onUseNextPalette && (
                      <button
                        type="button"
                        onClick={() => onUseNextPalette(dna.next_palette)}
                        className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-sm border border-zinc-300 hover:border-gold hover:bg-gold/5"
                        data-testid="dna-use-next-palette"
                      >
                        Usar no Studio
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-500 max-w-md">
                  Transforme seu DNA num cartão para o Instagram, TikTok ou
                  Etsy. PNG quadrado pronto para post.
                </p>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-[10px] tracking-[0.22em] uppercase"
                  data-testid="dna-share-open"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar cartão
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !dna && (
        <div className="px-5 md:px-7 pb-5" data-testid="visual-dna-error">
          <AIErrorState erro={error} onRetry={analyze} onUpgrade={abrirUpgradePadrao} />
        </div>
      )}

      <DNAShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        dna={dna}
      />
    </div>
  );
}

function DNAMetrics({ avg }) {
  const rows = [
    { key: "luxury", label: "Luxo" },
    { key: "contrast", label: "Contraste" },
    { key: "harmony", label: "Harmonia" },
    { key: "depth", label: "Profundidade" },
    { key: "sophistication", label: "Sofisticação" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const v = Math.max(0, Math.min(100, avg[r.key] || 0));
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
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
