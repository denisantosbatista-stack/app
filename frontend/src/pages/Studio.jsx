import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Search, Heart, Save, Download, Share2, X } from "lucide-react";
import { PRESET_PALETTES, STYLES, PIECES, MOCKUPS } from "@/data/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";
import PaletteCard from "@/components/PaletteCard";
import PieceShape from "@/components/PieceShape";
import ResinVisualizer from "@/components/ResinVisualizer";
import AIGenerator from "@/components/AIGenerator";
import ExportModal from "@/components/ExportModal";
import { copyToClipboard, isDark } from "@/utils/color";

export default function Studio() {
  const {
    activePaletteId,
    activeStyleId,
    activePieceId,
    saved,
    setActivePalette,
    setActiveStyle,
    setActivePiece,
    savePalette,
    toggleFavorite,
  } = usePaletteStore();

  const [search, setSearch] = useState("");
  const [filterStyle, setFilterStyle] = useState("todos");
  const [exportOpen, setExportOpen] = useState(false);
  const [aiPalette, setAiPalette] = useState(null);
  const captureRef = useRef(null);

  const allPalettes = useMemo(() => {
    const ai = aiPalette ? [aiPalette] : [];
    return [...ai, ...PRESET_PALETTES, ...saved];
  }, [saved, aiPalette]);

  const activePalette =
    allPalettes.find((p) => p.id === activePaletteId) || PRESET_PALETTES[0];
  const activeStyle = STYLES.find((s) => s.id === activeStyleId) || STYLES[0];
  const activePiece = PIECES.find((p) => p.id === activePieceId) || PIECES[0];

  const filtered = useMemo(() => {
    return allPalettes.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchStyle = filterStyle === "todos" || p.style === filterStyle;
      return matchSearch && matchStyle;
    });
  }, [allPalettes, search, filterStyle]);

  const handleSave = async () => {
    const id = toast.loading("Salvando…");
    try {
      const saved = await savePalette({ ...activePalette, source: aiPalette?.id === activePalette.id ? "ai" : "user" });
      toast.success(`"${saved.name}" salva na biblioteca`, { id });
      setActivePalette(saved.id);
    } catch (e) {
      toast.error("Erro ao salvar", { id });
    }
  };

  const handleFavoriteToggle = async (p) => {
    if (!saved.find((s) => s.id === p.id)) {
      // Save first, then mark favorite
      const newPal = await savePalette({ ...p, favorite: true });
      toast.success(`"${newPal.name}" salva como favorita`);
      setActivePalette(newPal.id);
    } else {
      toggleFavorite(p.id);
    }
  };

  const handleAIGenerated = (p) => {
    setAiPalette(p);
    setActivePalette(p.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12" data-testid="studio-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="label-eyebrow text-gold mb-3">Studio</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          Crie. Visualize. <span className="italic gold-shimmer">Exporte.</span>
        </h1>
        <p className="text-zinc-400 mt-3 max-w-2xl">
          Selecione uma paleta, escolha o estilo e veja a magia em peças reais.
          Toque uma cor para copiar o HEX.
        </p>
      </motion.div>

      {/* AI Generator */}
      <div className="mb-10">
        <AIGenerator onGenerated={handleAIGenerated} />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT: Palette grid */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">Paletas</h2>
            <span className="text-xs text-zinc-500">{filtered.length} disponíveis</span>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar paleta, tag ou cor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10"
                data-testid="palette-search"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1">
              <button
                onClick={() => setFilterStyle("todos")}
                className={`text-[10px] px-3 py-1.5 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                  filterStyle === "todos"
                    ? "bg-gold text-ink"
                    : "border border-white/10 text-zinc-300 hover:border-gold/40"
                }`}
                data-testid="filter-todos"
              >
                Todos
              </button>
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterStyle(s.id)}
                  className={`text-[10px] px-3 py-1.5 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                    filterStyle === s.id
                      ? "bg-gold text-ink"
                      : "border border-white/10 text-zinc-300 hover:border-gold/40"
                  }`}
                  data-testid={`filter-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[68vh] overflow-y-auto pr-1">
            {filtered.map((p, i) => (
              <PaletteCard
                key={p.id}
                palette={p}
                index={i}
                active={p.id === activePaletteId}
                favorite={saved.find((s) => s.id === p.id)?.favorite}
                onClick={() => setActivePalette(p.id)}
                onFavorite={handleFavoriteToggle}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-12 text-zinc-500 text-sm">
                Nenhuma paleta encontrada.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Visualizer + style + piece */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active palette header */}
          <div className="glass rounded-sm p-5" ref={captureRef} data-testid="active-palette-display">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="label-eyebrow text-gold">Paleta ativa</div>
                <h3 className="font-display text-3xl tracking-tight mt-1">{activePalette.name}</h3>
                <p className="text-zinc-400 text-sm">{activePalette.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="btn-outline-gold px-3 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5"
                  data-testid="save-palette-btn"
                >
                  <Save className="w-3 h-3" /> Salvar
                </button>
                <button
                  onClick={() => handleFavoriteToggle(activePalette)}
                  className="btn-outline-gold px-3 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5"
                  data-testid="fav-palette-btn"
                >
                  <Heart className="w-3 h-3" /> Favoritar
                </button>
                <button
                  onClick={() => setExportOpen(true)}
                  className="btn-gold px-3 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5"
                  data-testid="export-palette-btn"
                >
                  <Download className="w-3 h-3" /> Exportar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {activePalette.colors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    copyToClipboard(c.hex);
                    toast.success(`${c.hex} copiado`);
                  }}
                  className="group relative aspect-[3/4] rounded-sm overflow-hidden border border-white/[0.06] hover:border-gold/40 transition-all"
                  style={{ background: c.hex }}
                  data-testid={`active-swatch-${i}`}
                >
                  <div
                    className={`absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark(c.hex) ? "text-white" : "text-black"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider opacity-80">{c.role}</div>
                    <div className="font-mono text-xs">{c.hex.toUpperCase()}</div>
                  </div>
                  <div
                    className={`absolute top-2 right-2 text-[9px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm border ${
                      isDark(c.hex) ? "border-white/30 text-white/80" : "border-black/30 text-black/70"
                    }`}
                  >
                    {c.role}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl tracking-tight">Estilo</h3>
              <span className="text-xs text-zinc-500">{activeStyle.description}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStyle(s.id)}
                  className={`text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                    activeStyleId === s.id
                      ? "bg-gold text-ink shadow-gold"
                      : "border border-white/10 text-zinc-300 hover:border-gold/40"
                  }`}
                  data-testid={`style-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Piece preview + visualizer */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="glass rounded-sm p-5 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="label-eyebrow">Visualizador Líquido</span>
                <span className="text-[10px] text-gold tracking-[0.2em] uppercase">{activeStyle.label}</span>
              </div>
              <div className="aspect-square relative rounded-sm overflow-hidden">
                <ResinVisualizer palette={activePalette} size={360} className="w-full h-full" />
              </div>
            </div>

            <div className="glass rounded-sm p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="label-eyebrow">Peça</span>
                <span className="text-[10px] text-gold tracking-[0.2em] uppercase">{activePiece.label}</span>
              </div>
              <div className="aspect-square flex items-center justify-center">
                <PieceShape piece={activePiece} palette={activePalette} size={300} />
              </div>
            </div>
          </div>

          {/* Piece selector */}
          <div>
            <h3 className="font-display text-xl tracking-tight mb-3">Tipo de peça</h3>
            <div className="grid grid-cols-5 gap-2">
              {PIECES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePiece(p.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-sm transition-all ${
                    activePieceId === p.id
                      ? "bg-ink-elevated ring-1 ring-gold shadow-gold"
                      : "bg-ink-surface ring-1 ring-white/[0.06] hover:ring-white/20"
                  }`}
                  data-testid={`piece-${p.id}`}
                >
                  <div className="w-12 h-12">
                    <PieceShape piece={p} palette={activePalette} size={48} animated={false} />
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-300">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ExportModal palette={activePalette} captureRef={captureRef} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
