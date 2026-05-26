import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Download, FileImage, FileText, Code2, FileJson } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard } from "@/utils/color";
import {
  paletteToCSS,
  paletteToTailwind,
  paletteToJSON,
  downloadText,
  downloadPNG,
  downloadPDF,
} from "@/utils/export";

export default function ExportModal({ palette, captureRef, open, onClose }) {
  const [format, setFormat] = useState("css");

  if (!palette) return null;

  const formats = {
    css: { label: "CSS Vars", icon: Code2, content: paletteToCSS(palette), ext: "css" },
    tailwind: { label: "Tailwind", icon: Code2, content: paletteToTailwind(palette), ext: "js" },
    json: { label: "JSON", icon: FileJson, content: paletteToJSON(palette), ext: "json" },
  };

  const slug = palette.name.replace(/\s+/g, "-").toLowerCase();
  const current = formats[format];

  const handleCopy = () => {
    copyToClipboard(current.content);
    toast.success(`${current.label} copiado`);
  };

  const handleDownloadCode = () => {
    downloadText(`${slug}.${current.ext}`, current.content);
    toast.success(`${slug}.${current.ext} baixado`);
  };

  const handlePNG = async () => {
    if (!captureRef?.current) {
      toast.error("Preview não disponível");
      return;
    }
    const id = toast.loading("Gerando PNG…");
    try {
      await downloadPNG(captureRef.current, `${slug}.png`);
      toast.success("PNG baixado", { id });
    } catch (e) {
      toast.error("Erro ao gerar PNG", { id });
    }
  };

  const handlePDF = async () => {
    const id = toast.loading("Gerando PDF…");
    try {
      await downloadPDF(palette, captureRef?.current);
      toast.success("PDF baixado", { id });
    } catch (e) {
      toast.error("Erro ao gerar PDF", { id });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          data-testid="export-modal"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-sm w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
          >
            <header className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <div className="label-eyebrow text-gold">Exportar</div>
                <h3 className="font-display text-2xl tracking-tight mt-1">{palette.name}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-sm transition-colors"
                data-testid="close-export-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-white/[0.06]">
              {Object.entries(formats).map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider transition-all ${
                    format === key
                      ? "bg-gold text-ink"
                      : "border border-white/10 text-zinc-300 hover:border-gold/40"
                  }`}
                  data-testid={`export-tab-${key}`}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              ))}
              <button
                onClick={handlePNG}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider border border-white/10 text-zinc-300 hover:border-gold/40"
                data-testid="export-tab-png"
              >
                <FileImage className="w-3.5 h-3.5" />
                PNG
              </button>
              <button
                onClick={handlePDF}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider border border-white/10 text-zinc-300 hover:border-gold/40"
                data-testid="export-tab-pdf"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <pre className="text-xs text-zinc-200 font-mono bg-ink-elevated p-4 rounded-sm border border-white/[0.06] overflow-auto max-h-[40vh]">
                {current.content}
              </pre>
            </div>

            <footer className="flex items-center justify-between p-5 border-t border-white/[0.06] bg-ink-surface/50">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                {palette.colors.length} cores
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="btn-outline-gold px-4 py-2 rounded-sm text-xs tracking-wider uppercase inline-flex items-center gap-2"
                  data-testid="export-copy-btn"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="btn-gold px-4 py-2 rounded-sm text-xs tracking-wider uppercase inline-flex items-center gap-2"
                  data-testid="export-download-btn"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar {current.ext.toUpperCase()}
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
