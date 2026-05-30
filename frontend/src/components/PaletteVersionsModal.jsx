import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, RotateCcw, Trash2, Plus, Bookmark, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { usePaletteStore } from "@/store/usePaletteStore";

function formatDateBR(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function VersionSwatchStrip({ colors }) {
  const safe = Array.isArray(colors) ? colors.slice(0, 8) : [];
  if (!safe.length) {
    return (
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">
        sem cores
      </div>
    );
  }
  return (
    <div className="flex h-6 rounded-sm overflow-hidden border border-black/[0.08]">
      {safe.map((c, i) => (
        <div
          key={`${i}-${c?.hex || i}`}
          className="flex-1"
          style={{ background: c?.hex || "#ccc" }}
          title={c?.hex || ""}
        />
      ))}
    </div>
  );
}

function VersionItem({ version, onRestore, onDelete, disabled }) {
  const isManual = version.kind === "manual";
  const snapshot = version.snapshot || {};
  return (
    <div
      className="rounded-sm border border-black/[0.08] bg-white/60 p-4 hover:border-gold/40 transition-colors"
      data-testid={`palette-version-${version.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-[0.18em] ${
                isManual
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "bg-black/5 text-zinc-600 border border-black/10"
              }`}
            >
              {isManual ? (
                <Bookmark className="w-2.5 h-2.5" />
              ) : (
                <Sparkles className="w-2.5 h-2.5" />
              )}
              {isManual ? "Manual" : "Auto"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              v{version.version_number}
            </span>
          </div>
          <div
            className="font-display text-base tracking-tight mt-1 truncate"
            title={version.label}
          >
            {version.label}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {formatDateBR(version.created_at)}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onRestore(version)}
            disabled={disabled}
            className="btn-outline-gold px-2.5 py-1.5 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1 disabled:opacity-50"
            data-testid={`restore-version-${version.id}`}
            title="Restaurar esta versão"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar
          </button>
          <button
            onClick={() => onDelete(version)}
            disabled={disabled}
            className="px-2 py-1.5 rounded-sm text-[10px] uppercase tracking-[0.18em] border border-black/10 text-zinc-600 hover:text-red-600 hover:border-red-300 inline-flex items-center gap-1 disabled:opacity-50"
            data-testid={`delete-version-${version.id}`}
            title="Excluir versão"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          {snapshot.name || "Paleta"}
          {snapshot.style ? (
            <span className="ml-2 text-gold">· {snapshot.style}</span>
          ) : null}
        </div>
        <VersionSwatchStrip colors={snapshot.colors} />
      </div>
    </div>
  );
}

export default function PaletteVersionsModal({ palette, open, onClose }) {
  const {
    versions,
    loadingVersions,
    loadVersions,
    saveManualVersion,
    restoreVersion,
    deleteVersion,
  } = usePaletteStore();

  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && palette?.id) {
      loadVersions(palette.id).catch(() => {
        toast.error("Não foi possível carregar as versões");
      });
    }
    if (!open) setLabel("");
  }, [open, palette?.id, loadVersions]);

  if (!palette) return null;

  const handleCreateManual = async () => {
    const clean = label.trim();
    if (!clean) {
      toast.error("Dê um nome para esta versão");
      return;
    }
    setBusy(true);
    const id = toast.loading("Salvando versão…");
    try {
      await saveManualVersion(palette.id, clean);
      toast.success("Versão salva", { id });
      setLabel("");
    } catch {
      toast.error("Falha ao salvar versão", { id });
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (version) => {
    setBusy(true);
    const id = toast.loading(`Restaurando v${version.version_number}…`);
    try {
      await restoreVersion(palette.id, version.id);
      toast.success(
        `Versão "${version.label}" restaurada. Estado anterior salvo como auto-snapshot.`,
        { id, duration: 4000 }
      );
    } catch (e) {
      const msg = e?.response?.data?.detail || "Falha ao restaurar versão";
      toast.error(msg, { id });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (version) => {
    if (!window.confirm(`Excluir versão "${version.label}"?`)) return;
    setBusy(true);
    try {
      await deleteVersion(palette.id, version.id);
      toast.success("Versão excluída");
    } catch (e) {
      const msg =
        e?.response?.data?.detail || "Falha ao excluir versão";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const manualCount = versions.filter((v) => v.kind === "manual").length;
  const autoCount = versions.filter((v) => v.kind === "auto").length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          data-testid="palette-versions-modal"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-sm w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
          >
            <header className="flex items-center justify-between p-5 border-b border-black/[0.06]">
              <div className="min-w-0">
                <div className="label-eyebrow text-gold inline-flex items-center gap-1.5">
                  <History className="w-3 h-3" /> Versões
                </div>
                <h3
                  className="font-display text-2xl tracking-tight mt-1 truncate"
                  title={palette.name}
                >
                  {palette.name}
                </h3>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {manualCount} {manualCount === 1 ? "manual" : "manuais"} ·{" "}
                  {autoCount} auto · máx. 20 auto (FIFO)
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 rounded-sm transition-colors"
                data-testid="close-versions-modal"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 border-b border-black/[0.06] bg-ink-surface/40">
              <div className="label-eyebrow mb-2">Salvar versão atual</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateManual();
                  }}
                  placeholder='Ex.: "Antes de mudar o tom de ouro"'
                  maxLength={80}
                  disabled={busy}
                  className="flex-1 px-3 py-2 rounded-sm border border-black/10 bg-white/80 text-sm placeholder:text-zinc-400 focus:border-gold/50 focus:outline-none"
                  data-testid="version-label-input"
                />
                <button
                  onClick={handleCreateManual}
                  disabled={busy || !label.trim()}
                  className="btn-gold px-4 py-2 rounded-sm text-xs tracking-wider uppercase inline-flex items-center gap-2 disabled:opacity-50"
                  data-testid="save-manual-version-btn"
                >
                  <Plus className="w-3.5 h-3.5" /> Salvar
                </button>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1.5">
                Versões manuais ficam sempre no topo e nunca são apagadas
                automaticamente.
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-3">
              {loadingVersions ? (
                <div className="text-center text-sm text-zinc-500 py-10">
                  Carregando versões…
                </div>
              ) : versions.length === 0 ? (
                <div
                  className="text-center text-sm text-zinc-500 py-10"
                  data-testid="versions-empty-state"
                >
                  Nenhuma versão ainda. Salve uma versão manual ou edite a
                  paleta para gerar um auto-snapshot.
                </div>
              ) : (
                versions.map((v) => (
                  <VersionItem
                    key={v.id}
                    version={v}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                    disabled={busy}
                  />
                ))
              )}
            </div>

            <footer className="flex items-center justify-between p-4 border-t border-black/[0.06] bg-ink-surface/50">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {versions.length}{" "}
                {versions.length === 1 ? "versão" : "versões"} no total
              </span>
              <button
                onClick={onClose}
                className="btn-outline-gold px-4 py-2 rounded-sm text-xs tracking-wider uppercase"
                data-testid="versions-modal-done-btn"
              >
                Fechar
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
