import { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Sparkles,
  Copy,
  Loader2,
  Image as ImageIcon,
  Wand2,
  Plus,
  X,
  Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const PIECE_PRESETS = [
  "bandeja",
  "relógio de parede",
  "porta-copos",
  "arte de parede",
  "geodo decorativo",
  "luminária",
  "colar",
  "anel",
  "brinco",
  "puxador de gaveta",
];

const SUGGESTIONS = [
  "Coleção oceano premium",
  "Mármore rosé com ouro fosco",
  "Galáxia smokey & metálico",
  "Âmbar translúcido botânico",
  "Pastel geodo feminino",
];

export default function Collections() {
  const [theme, setTheme] = useState("");
  const [pieces, setPieces] = useState([
    "bandeja",
    "relógio de parede",
    "porta-copos",
    "arte de parede",
  ]);
  const [customPiece, setCustomPiece] = useState("");
  const [loading, setLoading] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [collection, setCollection] = useState(null);
  const [mockups, setMockups] = useState({}); // index -> { loading, image_base64, mime_type }
  const savePalette = usePaletteStore((s) => s.savePalette);

  function togglePiece(p) {
    setPieces((curr) =>
      curr.includes(p) ? curr.filter((x) => x !== p) : curr.length >= 6 ? curr : [...curr, p]
    );
  }

  function addCustomPiece() {
    const v = customPiece.trim();
    if (!v) return;
    if (pieces.length >= 6) {
      toast.error("Máximo de 6 peças por coleção");
      return;
    }
    if (pieces.includes(v)) {
      toast.error("Essa peça já está na coleção");
      return;
    }
    setPieces((p) => [...p, v]);
    setCustomPiece("");
  }

  function removePiece(p) {
    setPieces((curr) => curr.filter((x) => x !== p));
  }

  async function generate() {
    const t = theme.trim();
    if (!t) {
      setThemeError("Descreva o tema da coleção para continuar.");
      toast.error("Descreva o tema da coleção");
      return;
    }
    setThemeError("");
    if (pieces.length === 0) {
      toast.error("Selecione ao menos uma peça");
      return;
    }
    setLoading(true);
    setCollection(null);
    setMockups({});
    setRetryAttempt(0);

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;
    let lastError = null;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setRetryAttempt(attempt);
        try {
          const res = await fetch(`${API_BASE}/api/ai/collection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: t, pieces }),
          });

          if (res.status === 503) {
            lastError = new Error("Serviço indisponível (503)");
            if (attempt < MAX_ATTEMPTS) {
              toast.loading(
                `Servidor ocupado, tentando novamente (${attempt}/${MAX_ATTEMPTS})…`,
                { id: "collection-retry", duration: RETRY_DELAY_MS }
              );
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
              continue;
            }
            throw lastError;
          }

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
          }

          const data = await res.json();
          toast.dismiss("collection-retry");
          setCollection(data);
          toast.success(`"${data.collection_name}" criada!`);
          return;
        } catch (innerErr) {
          // Apenas relança erros que não sejam 503 retentáveis
          if (innerErr?.message !== "Serviço indisponível (503)") {
            throw innerErr;
          }
          lastError = innerErr;
        }
      }
      throw lastError || new Error("Falha ao gerar coleção");
    } catch (e) {
      toast.dismiss("collection-retry");
      toast.error(e.message || "Erro ao gerar coleção");
      console.error(e);
    } finally {
      setLoading(false);
      setRetryAttempt(0);
    }
  }

  async function generateMockup(index, piece) {
    setMockups((m) => ({ ...m, [index]: { loading: true } }));
    try {
      const colors = (collection?.palette?.colors || []).map((c) => c.hex).filter(Boolean);
      const res = await fetch(`${API_BASE}/api/ai/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: piece.mockup_prompt || `Luxury epoxy resin ${piece.type || "piece"}`,
          colors,
          shape: piece.type || "peça",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMockups((m) => ({
        ...m,
        [index]: {
          loading: false,
          image_base64: data.image_base64,
          mime_type: data.mime_type || "image/png",
        },
      }));
    } catch (e) {
      setMockups((m) => ({ ...m, [index]: { loading: false, error: true } }));
      toast.error(e.message || "Erro ao gerar mockup");
    }
  }

  function copyPalette() {
    const colors = (collection?.palette?.colors || []).map((c) => c.hex).filter(Boolean);
    if (!colors.length) return;
    navigator.clipboard.writeText(colors.join(", "));
    toast.success("Paleta copiada!");
  }

  async function saveCollectionPalette() {
    if (!collection) return;
    try {
      await savePalette({
        name: collection.collection_name,
        description: collection.concept || "",
        colors: collection.palette?.colors || [],
        style: "luxo",
        tags: ["coleção", "ai"],
        favorite: false,
        source: "ai_collection",
      });
      toast.success("Paleta da coleção salva na biblioteca");
    } catch {
      toast.error("Erro ao salvar paleta");
    }
  }

  function downloadMockup(index, piece) {
    const m = mockups[index];
    if (!m?.image_base64) return;
    const a = document.createElement("a");
    a.href = `data:${m.mime_type};base64,${m.image_base64}`;
    a.download = `${(piece.title || piece.type || "mockup")
      .toLowerCase()
      .replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="max-w-6xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-6"
      data-testid="collections-page"
    >
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="label-eyebrow text-gold flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5" /> Gerador de Coleções
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Crie uma <span className="italic gold-shimmer">coleção coerente</span>
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
          Descreva um tema e selecione até 6 peças. A IA cria a paleta única e o
          conceito de cada peça, prontos para virar mockup fotorrealista.
        </p>
      </motion.header>

      {/* Form */}
      <section className="bg-ink-surface border border-black/[0.06] rounded-sm p-5 md:p-7 mb-8">
        <label className="label-eyebrow text-zinc-500 block mb-2">Tema da coleção</label>
        <input
          value={theme}
          onChange={(e) => {
            setTheme(e.target.value);
            if (themeError) setThemeError("");
          }}
          placeholder='Ex: "Coleção oceano premium com toques de champagne"'
          maxLength={200}
          aria-invalid={!!themeError}
          aria-describedby={themeError ? "collection-theme-error" : undefined}
          className={`w-full bg-ink border rounded-sm px-4 py-3 text-sm md:text-base focus:outline-none transition-colors ${
            themeError
              ? "border-red-500/70 focus:border-red-500"
              : "border-black/[0.08] focus:border-gold"
          }`}
          data-testid="collection-theme-input"
        />
        {themeError && (
          <p
            id="collection-theme-error"
            role="alert"
            className="text-xs text-red-500 mt-1.5"
            data-testid="collection-theme-error"
          >
            {themeError}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setTheme(s)}
              className="text-[10px] tracking-[0.12em] uppercase text-zinc-500 hover:text-gold border border-black/[0.06] hover:border-gold/40 px-2 py-1 rounded-sm transition-colors"
              data-testid={`suggestion-${s.slice(0, 12)}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label className="label-eyebrow text-zinc-500 block mb-2">
            Peças ({pieces.length}/6)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PIECE_PRESETS.map((p) => {
              const active = pieces.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePiece(p)}
                  className={`text-xs px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-[0.14em] ${
                    active
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-black/[0.08] bg-ink text-zinc-600 hover:border-gold/50"
                  }`}
                  data-testid={`piece-toggle-${p.replace(/\s+/g, "-")}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          {pieces.filter((p) => !PIECE_PRESETS.includes(p)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {pieces
                .filter((p) => !PIECE_PRESETS.includes(p))
                .map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-gold bg-gold/10 text-gold uppercase tracking-[0.14em]"
                  >
                    {p}
                    <button
                      onClick={() => removePiece(p)}
                      className="hover:text-ink-text"
                      title="Remover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={customPiece}
              onChange={(e) => setCustomPiece(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomPiece()}
              placeholder="Peça personalizada (ex: vaso, painel)"
              maxLength={40}
              className="flex-1 bg-ink border border-black/[0.08] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
              data-testid="custom-piece-input"
            />
            <button
              onClick={addCustomPiece}
              disabled={!customPiece.trim() || pieces.length >= 6}
              className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              data-testid="add-custom-piece"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] tracking-[0.18em] uppercase">Add</span>
            </button>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="btn-gold mt-6 px-6 py-3 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="generate-collection-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span data-testid="generate-collection-loading-text">
                Gerando sua coleção...
                {retryAttempt > 1 ? ` (tentativa ${retryAttempt}/3)` : ""}
              </span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" /> Gerar coleção
            </>
          )}
        </button>
      </section>

      {/* Result */}
      {collection && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          data-testid="collection-result"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="label-eyebrow text-zinc-500 mb-2">Sua coleção</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.05]">
              {collection.collection_name}
            </h2>
            {collection.concept && (
              <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
                “{collection.concept}”
              </p>
            )}
          </div>

          {/* Palette */}
          <div className="bg-ink-surface border border-black/[0.06] rounded-sm overflow-hidden mb-8">
            <div className="h-24 md:h-32 flex">
              {(collection.palette?.colors || []).map((c, i) => (
                <div
                  key={`${c.hex}-${i}`}
                  style={{ background: c.hex }}
                  className="flex-1 group relative"
                  title={`${c.name || ""} (${c.role || ""})`}
                >
                  <div className="absolute inset-x-0 bottom-1 text-center text-[9px] font-mono text-white/80 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                    {c.hex?.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 md:p-5 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="font-display text-lg">
                  {collection.palette?.name || "Paleta"}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-mono mt-1">
                  {(collection.palette?.colors || []).map((c, i) => (
                    <span key={i}>
                      {c.hex?.toUpperCase()}{" "}
                      <span className="text-zinc-400 normal-case font-sans not-italic">
                        · {c.role || c.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPalette}
                  className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors inline-flex items-center gap-1.5"
                  data-testid="copy-collection-palette"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px] tracking-[0.18em] uppercase">Copiar</span>
                </button>
                <button
                  onClick={saveCollectionPalette}
                  className="btn-gold px-3 py-2 rounded-sm text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-1.5"
                  data-testid="save-collection-palette"
                >
                  <Sparkles className="w-3 h-3" /> Salvar paleta
                </button>
              </div>
            </div>
          </div>

          {/* Pieces grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(collection.pieces || []).map((p, i) => {
              const m = mockups[i];
              return (
                <motion.article
                  key={`${p.type}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="bg-ink-surface border border-black/[0.06] rounded-sm overflow-hidden hover:border-gold/40 transition-colors flex flex-col"
                  data-testid="collection-piece"
                >
                  {/* Mockup zone */}
                  <div className="aspect-[4/3] bg-ink relative flex items-center justify-center overflow-hidden">
                    {m?.image_base64 ? (
                      <img
                        src={`data:${m.mime_type};base64,${m.image_base64}`}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        data-testid={`piece-mockup-${i}`}
                      />
                    ) : m?.loading ? (
                      <div className="flex flex-col items-center gap-2 text-gold">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[10px] tracking-[0.22em] uppercase">
                          Gerando mockup…
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-[10px] tracking-[0.22em] uppercase">
                          Mockup pendente
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 mb-1">
                      {p.type}
                    </div>
                    <h3 className="font-display text-xl tracking-tight leading-tight mb-2">
                      {p.title}
                    </h3>
                    <p className="text-zinc-600 text-sm leading-relaxed mb-3 flex-1">
                      {p.description}
                    </p>
                    {p.finish && (
                      <div className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-2">
                        Acabamento:{" "}
                        <span className="text-zinc-700">{p.finish}</span>
                      </div>
                    )}
                    {Array.isArray(p.highlights) && p.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.highlights.slice(0, 4).map((h) => (
                          <span
                            key={h}
                            className="text-[10px] tracking-[0.12em] uppercase text-zinc-500 bg-ink/40 border border-black/[0.06] px-2 py-0.5 rounded-sm"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => generateMockup(i, p)}
                        disabled={m?.loading}
                        className="btn-gold px-3 py-2 rounded-sm text-[10px] tracking-[0.18em] uppercase flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                        data-testid={`generate-mockup-${i}`}
                      >
                        {m?.loading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Gerando…
                          </>
                        ) : m?.image_base64 ? (
                          <>
                            <Wand2 className="w-3 h-3" /> Regerar
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3" /> Gerar mockup
                          </>
                        )}
                      </button>
                      {m?.image_base64 && (
                        <button
                          onClick={() => downloadMockup(i, p)}
                          className="px-3 py-2 rounded-sm border border-black/[0.08] text-zinc-600 hover:border-gold hover:text-gold transition-colors"
                          title="Baixar mockup"
                          data-testid={`download-mockup-${i}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}
