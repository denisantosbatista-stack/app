import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Heart, Save, Download, Share2 } from "lucide-react";
import { PRESET_PALETTES, STYLES, PIECES } from "@/data/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";
import PaletteGrid from "@/components/PaletteGrid";
import PieceShape from "@/components/PieceShape";
import ResinVisualizer from "@/components/ResinVisualizer";
import AIGenerator from "@/components/AIGenerator";
import ExportModal from "@/components/ExportModal";
import { StyleSelector, PieceSelector } from "@/components/PieceSelectors";
import Productions3D from "@/components/Productions3D";
import MarketingPanel from "@/components/MarketingPanel";
import { copyToClipboard, isDark } from "@/utils/color";
import { encodePaletteToUrl, decodePaletteFromSearch } from "@/utils/share";

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
  const [sharedPalette, setSharedPalette] = useState(null);
  const captureRef = useRef(null);

  // Importa paleta vinda de link compartilhado (?c=hex-hex-...)
  useEffect(() => {
    const shared = decodePaletteFromSearch(window.location.search);
    if (shared) {
      setSharedPalette(shared);
      setActivePalette(shared.id);
      toast.success(`Paleta "${shared.name}" importada do link`, { duration: 3500 });
      // Limpa querystring sem recarregar para evitar re-importar em refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atalhos de teclado: G (gerar), S (salvar), E (exportar), F (favoritar), ? (ajuda)
  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    };
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "g") {
        e.preventDefault();
        const input = document.querySelector('[data-testid="ai-prompt-input"]');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          toast("Descreva sua paleta e Enter para gerar", { icon: "✨", duration: 2000 });
        }
      } else if (k === "s") {
        e.preventDefault();
        document.querySelector('[data-testid="save-palette-btn"]')?.click();
      } else if (k === "e") {
        e.preventDefault();
        document.querySelector('[data-testid="export-palette-btn"]')?.click();
      } else if (k === "f") {
        e.preventDefault();
        document.querySelector('[data-testid="fav-palette-btn"]')?.click();
      } else if (k === "?" || (e.shiftKey && k === "/")) {
        e.preventDefault();
        toast(
          "Atalhos: G gerar · S salvar · E exportar · F favoritar",
          { icon: "⌨️", duration: 4000 }
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const allPalettes = useMemo(
    () => [
      ...(sharedPalette ? [sharedPalette] : []),
      ...(aiPalette ? [aiPalette] : []),
      ...PRESET_PALETTES,
      ...saved,
    ],
    [saved, aiPalette, sharedPalette]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allPalettes.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchStyle = filterStyle === "todos" || p.style === filterStyle;
      return matchSearch && matchStyle;
    });
  }, [allPalettes, search, filterStyle]);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);
  const favoriteIds = useMemo(
    () => new Set(saved.filter((s) => s.favorite).map((s) => s.id)),
    [saved]
  );

  const activePalette =
    allPalettes.find((p) => p.id === activePaletteId) || PRESET_PALETTES[0];
  const activeStyle = STYLES.find((s) => s.id === activeStyleId) || STYLES[0];
  const activePiece = PIECES.find((p) => p.id === activePieceId) || PIECES[0];

  const handleSave = async () => {
    const id = toast.loading("Salvando…");
    try {
      const isAi = aiPalette?.id === activePalette.id;
      const result = await savePalette({ ...activePalette, source: isAi ? "ai" : "user" });
      toast.success(`"${result.name}" salva na biblioteca`, { id });
      setActivePalette(result.id);
    } catch (e) {
      toast.error("Erro ao salvar", { id });
    }
  };

  const handleFavoriteToggle = async (p) => {
    if (!savedIds.has(p.id)) {
      const newPal = await savePalette({ ...p, favorite: true });
      toast.success(`"${newPal.name}" salva como favorita`);
      setActivePalette(newPal.id);
    } else {
      toggleFavorite(p.id);
    }
  };

  const handleShare = async () => {
    const url = encodePaletteToUrl(activePalette);
    try {
      await copyToClipboard(url);
      toast.success("Link da paleta copiado", {
        duration: 2500,
        icon: "🔗",
      });
    } catch {
      toast.error("Não foi possível copiar o link");
    }
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
        <p className="text-zinc-600 mt-3 max-w-2xl">
          Selecione uma paleta, escolha o estilo e veja a magia em peças reais.
          Toque uma cor para copiar o HEX.
        </p>
        <div
          className="hidden md:flex items-center gap-2 mt-4 text-[10px] uppercase tracking-[0.18em] text-zinc-500"
          data-testid="keyboard-shortcuts-hint"
        >
          <span className="opacity-70">Atalhos:</span>
          <Kbd>G</Kbd><span className="opacity-60">gerar</span>
          <Kbd>S</Kbd><span className="opacity-60">salvar</span>
          <Kbd>E</Kbd><span className="opacity-60">exportar</span>
          <Kbd>F</Kbd><span className="opacity-60">favoritar</span>
          <Kbd>?</Kbd><span className="opacity-60">ajuda</span>
        </div>
      </motion.div>

      <div className="mb-10">
        <AIGenerator
          onGenerated={(p) => {
            setAiPalette(p);
            setActivePalette(p.id);
          }}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <PaletteGrid
            palettes={filtered}
            activePaletteId={activePaletteId}
            savedIds={savedIds}
            favoriteIds={favoriteIds}
            search={search}
            filterStyle={filterStyle}
            onSearchChange={setSearch}
            onFilterChange={setFilterStyle}
            onPaletteClick={setActivePalette}
            onFavorite={handleFavoriteToggle}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <ActivePaletteHeader
            palette={activePalette}
            captureRef={captureRef}
            onSave={handleSave}
            onFavorite={() => handleFavoriteToggle(activePalette)}
            onExport={() => setExportOpen(true)}
            onShare={handleShare}
          />

          <StyleSelector activeStyleId={activeStyleId} onChange={setActiveStyle} activeStyle={activeStyle} />

          <div className="grid sm:grid-cols-2 gap-5">
            <VisualizerCard palette={activePalette} activeStyle={activeStyle} />
            <PieceCard piece={activePiece} palette={activePalette} />
          </div>

          <PieceSelector activePieceId={activePieceId} onChange={setActivePiece} palette={activePalette} />

          <Productions3D palette={activePalette} />
        </div>
      </div>

      <div className="mt-10">
        <MarketingPanel palette={activePalette} />
      </div>

      <ExportModal
        palette={activePalette}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}

function ActivePaletteHeader({ palette, captureRef, onSave, onFavorite, onExport, onShare }) {
  return (
    <div className="glass rounded-sm p-5" ref={captureRef} data-testid="active-palette-display">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-gold">Paleta ativa</div>
          <h3 className="font-display text-3xl tracking-tight mt-1">{palette.name}</h3>
          <p className="text-zinc-600 text-sm">{palette.description}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <HeaderButton onClick={onSave} icon={Save} label="Salvar" testid="save-palette-btn" />
          <HeaderButton onClick={onFavorite} icon={Heart} label="Favoritar" testid="fav-palette-btn" />
          <HeaderButton onClick={onShare} icon={Share2} label="Compartilhar" testid="share-palette-btn" />
          <HeaderButton onClick={onExport} icon={Download} label="Exportar" testid="export-palette-btn" primary />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {palette.colors.map((c) => (
          <SwatchBlock key={`${palette.id}-${c.role}-${c.hex}`} swatch={c} />
        ))}
      </div>
    </div>
  );
}

function HeaderButton({ onClick, icon: Icon, label, testid, primary }) {
  const klass = primary ? "btn-gold" : "btn-outline-gold";
  return (
    <button
      onClick={onClick}
      className={`${klass} px-3 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5`}
      data-testid={testid}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[3px] border border-black/15 bg-white/70 text-[10px] font-mono font-semibold text-ink-text shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      {children}
    </kbd>
  );
}

function SwatchBlock({ swatch }) {
  const dark = isDark(swatch.hex);
  const handleClick = () => {
    copyToClipboard(swatch.hex);
    toast.success(`${swatch.hex} copiado`);
  };
  return (
    <button
      onClick={handleClick}
      className="group relative aspect-[3/4] rounded-sm overflow-hidden border border-black/[0.06] hover:border-gold/40 transition-all"
      style={{ background: swatch.hex }}
      data-testid={`active-swatch-${swatch.role}`}
    >
      <div
        className={`absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity ${
          dark ? "text-ink-text" : "text-black"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wider opacity-80">{swatch.role}</div>
        <div className="font-mono text-xs">{swatch.hex.toUpperCase()}</div>
      </div>
      <div
        className={`absolute top-2 right-2 text-[9px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm border ${
          dark ? "border-black/25 text-ink-text/80" : "border-black/30 text-black/70"
        }`}
      >
        {swatch.role}
      </div>
    </button>
  );
}

function VisualizerCard({ palette, activeStyle }) {
  return (
    <div className="glass rounded-sm p-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
      <div className="flex items-center justify-between mb-3">
        <span className="label-eyebrow">Visualizador Líquido</span>
        <span className="text-[10px] text-gold tracking-[0.2em] uppercase">{activeStyle.label}</span>
      </div>
      <div className="aspect-square relative rounded-sm overflow-hidden">
        <ResinVisualizer palette={palette} size={360} className="w-full h-full" />
      </div>
    </div>
  );
}

function PieceCard({ piece, palette }) {
  return (
    <div className="glass rounded-sm p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="label-eyebrow">Peça</span>
        <span className="text-[10px] text-gold tracking-[0.2em] uppercase">{piece.label}</span>
      </div>
      <div className="aspect-square flex items-center justify-center">
        <PieceShape piece={piece} palette={palette} size={300} />
      </div>
    </div>
  );
}
