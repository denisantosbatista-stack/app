import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Heart, Save, Download, Share2, History, MoreHorizontal, ChevronDown, Sparkles } from "lucide-react";
import { PRESET_PALETTES, STYLES, PIECES } from "@/data/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";
import PaletteGrid from "@/components/PaletteGrid";
import PieceShape from "@/components/PieceShape";
import ResinVisualizer from "@/components/ResinVisualizer";
import AIGenerator from "@/components/AIGenerator";
import ExportModal from "@/components/ExportModal";
import PaletteVersionsModal from "@/components/PaletteVersionsModal";
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
  const [versionsOpen, setVersionsOpen] = useState(false);
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
            onVersions={() => setVersionsOpen(true)}
            isSaved={savedIds.has(activePalette.id)}
          />

          <StyleSelector activeStyleId={activeStyleId} onChange={setActiveStyle} activeStyle={activeStyle} />

          <div className="grid sm:grid-cols-2 gap-5">
            <VisualizerCard palette={activePalette} activeStyle={activeStyle} />
            <PieceCard piece={activePiece} palette={activePalette} />
          </div>

          <PieceSelector activePieceId={activePieceId} onChange={setActivePiece} palette={activePalette} />

          <Productions3D palette={activePalette} activePiece={activePiece} />
        </div>
      </div>

      <div className="mt-10">
        <MarketingAccordion palette={activePalette} />
      </div>

      <ExportModal
        palette={activePalette}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <PaletteVersionsModal
        palette={savedIds.has(activePalette.id) ? activePalette : null}
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
      />
    </div>
  );
}

function ActivePaletteHeader({ palette, captureRef, onSave, onFavorite, onExport, onShare, onVersions, isSaved }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  // Sanitiza nome: nomes legados "Mistura #XXXXXX × #XXXXXX" → "Mistura Personalizada"
  const displayName = /Mistura\s+#[0-9A-Fa-f]{3,6}/.test(palette.name)
    ? "Mistura Personalizada"
    : palette.name;

  const runAndClose = (fn) => () => {
    setMenuOpen(false);
    fn?.();
  };

  return (
    <div className="glass rounded-sm p-5" ref={captureRef} data-testid="active-palette-display">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-gold">Paleta ativa</div>
          <h3 className="font-display text-3xl tracking-tight mt-1">{displayName}</h3>
          <p className="text-zinc-600 text-sm">{palette.description}</p>
        </div>
        <div className="flex gap-2 items-center" ref={menuRef}>
          <HeaderButton onClick={onExport} icon={Download} label="Exportar" testid="export-palette-btn" primary />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-outline-gold px-3 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Mais ações"
              data-testid="palette-actions-menu-btn"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-30 min-w-[180px] glass rounded-sm border border-black/10 shadow-lg py-1"
                data-testid="palette-actions-menu"
              >
                <MenuItem icon={Save} label="Salvar" onClick={runAndClose(onSave)} testid="save-palette-btn" />
                <MenuItem icon={Heart} label="Favoritar" onClick={runAndClose(onFavorite)} testid="fav-palette-btn" />
                {isSaved && (
                  <MenuItem icon={History} label="Versões" onClick={runAndClose(onVersions)} testid="versions-palette-btn" />
                )}
                <MenuItem icon={Share2} label="Compartilhar" onClick={runAndClose(onShare)} testid="share-palette-btn" />
              </div>
            )}
          </div>
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

function MenuItem({ icon: Icon, label, onClick, testid }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-zinc-700 hover:bg-gold/15 hover:text-ink-text inline-flex items-center gap-2"
      data-testid={testid}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
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

function MarketingAccordion({ palette }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-sm border border-black/[0.06]" data-testid="marketing-accordion">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        data-testid="marketing-accordion-toggle"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="label-eyebrow text-gold">Gerar legenda para redes sociais</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <MarketingPanel palette={palette} />
        </div>
      )}
    </div>
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
