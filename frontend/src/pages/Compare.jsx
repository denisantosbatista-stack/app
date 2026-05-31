import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Copy, Eye, Check, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { PRESET_PALETTES } from "@/data/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";
import { hexToRgb, isDark, copyToClipboard } from "@/utils/color";
import { encodePaletteToUrl } from "@/utils/share";
import CompareView3D from "@/components/CompareView3D";

// Luminância relativa (WCAG)
function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a, b) {
  const La = relLuminance(a);
  const Lb = relLuminance(b);
  const [hi, lo] = La > Lb ? [La, Lb] : [Lb, La];
  return (hi + 0.05) / (lo + 0.05);
}

function paletteContrastScore(palette) {
  // Média de contrastes entre cor base e demais cores
  if (!palette.colors?.length) return 0;
  const base = palette.colors[0].hex;
  const others = palette.colors.slice(1);
  if (!others.length) return 0;
  const sum = others.reduce((acc, c) => acc + contrastRatio(base, c.hex), 0);
  return sum / others.length;
}

function paletteDiversity(palette) {
  // Variância de luminância (0-1)
  const lums = (palette.colors || []).map((c) => relLuminance(c.hex));
  if (lums.length < 2) return 0;
  const avg = lums.reduce((a, b) => a + b, 0) / lums.length;
  const v = lums.reduce((a, l) => a + (l - avg) ** 2, 0) / lums.length;
  return Math.min(1, Math.sqrt(v) * 2);
}

export default function Compare() {
  const saved = usePaletteStore((s) => s.saved);
  const all = useMemo(() => [...PRESET_PALETTES, ...saved], [saved]);

  const [aId, setAId] = useState(all[0]?.id);
  const [bId, setBId] = useState(all[1]?.id || all[0]?.id);

  const A = all.find((p) => p.id === aId) || all[0];
  const B = all.find((p) => p.id === bId) || all[1] || all[0];

  const stats = useMemo(() => {
    if (!A || !B) return null;
    return {
      contrastA: paletteContrastScore(A),
      contrastB: paletteContrastScore(B),
      diversityA: paletteDiversity(A),
      diversityB: paletteDiversity(B),
    };
  }, [A, B]);

  const swap = () => {
    setAId(bId);
    setBId(aId);
  };

  if (!A || !B) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-600" data-testid="compare-empty">
        Adicione paletas à biblioteca para comparar.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12" data-testid="compare-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <div className="label-eyebrow text-gold mb-3">Comparador</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          A <span className="italic gold-shimmer">vs</span> B
        </h1>
        <p className="text-zinc-600 mt-3 max-w-xl">
          Compare duas paletas lado a lado. Veja contraste WCAG, harmonia e diversidade
          para escolher a melhor para sua peça.
        </p>
      </motion.div>

      <div className="flex items-center justify-center mb-6">
        <button
          onClick={swap}
          className="btn-outline-gold px-4 py-2 rounded-sm text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-2"
          data-testid="compare-swap-btn"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Trocar A ⇄ B
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SideColumn
          label="A"
          palette={A}
          options={all}
          selectedId={aId}
          onSelect={setAId}
          contrast={stats?.contrastA}
          diversity={stats?.diversityA}
          opponentContrast={stats?.contrastB}
          opponentDiversity={stats?.diversityB}
          testid="compare-a"
        />
        <SideColumn
          label="B"
          palette={B}
          options={all}
          selectedId={bId}
          onSelect={setBId}
          contrast={stats?.contrastB}
          diversity={stats?.diversityB}
          opponentContrast={stats?.contrastA}
          opponentDiversity={stats?.diversityA}
          testid="compare-b"
        />
      </div>

      <CompareView3D paletteA={A} paletteB={B} />

      <ContrastMatrix A={A} B={B} />
    </div>
  );
}

function SideColumn({
  label,
  palette,
  options,
  selectedId,
  onSelect,
  contrast,
  diversity,
  opponentContrast,
  opponentDiversity,
  testid,
}) {
  const winsContrast = contrast > opponentContrast;
  const winsDiversity = diversity > opponentDiversity;

  const handleShare = () => {
    const url = encodePaletteToUrl(palette);
    copyToClipboard(url);
    toast.success("Link copiado");
  };

  return (
    <div className="glass rounded-sm p-5 space-y-4" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div>
          <div className="label-eyebrow text-gold">Paleta {label}</div>
          <h2 className="font-display text-2xl tracking-tight">{palette.name}</h2>
          <p className="text-xs text-zinc-600">{palette.description}</p>
        </div>
        <button
          onClick={handleShare}
          className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 hover:text-gold inline-flex items-center gap-1"
          data-testid={`${testid}-share`}
        >
          <Copy className="w-3 h-3" /> Link
        </button>
      </div>

      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 rounded-sm border border-black/10 bg-ink-surface text-sm"
        data-testid={`${testid}-select`}
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-4 gap-1.5 h-24">
        {palette.colors.map((c) => (
          <div
            key={c.hex + c.role}
            className="relative rounded-sm cursor-copy group"
            style={{ background: c.hex }}
            onClick={() => {
              copyToClipboard(c.hex);
              toast.success(`${c.hex} copiado`);
            }}
            data-testid={`${testid}-swatch-${c.role}`}
          >
            <span
              className={`absolute inset-x-0 bottom-1 text-center text-[9px] font-mono opacity-0 group-hover:opacity-100 ${
                isDark(c.hex) ? "text-ink-text" : "text-black"
              }`}
            >
              {c.hex.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.06]">
        <Metric
          label="Contraste"
          value={contrast?.toFixed(2) || "—"}
          help="WCAG (alvo: ≥ 4.5)"
          wins={winsContrast}
          good={contrast >= 4.5}
          testid={`${testid}-contrast`}
        />
        <Metric
          label="Diversidade"
          value={diversity ? `${(diversity * 100).toFixed(0)}%` : "—"}
          help="Variação de luminância"
          wins={winsDiversity}
          good={diversity >= 0.35}
          testid={`${testid}-diversity`}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, help, wins, good, testid }) {
  return (
    <div className="p-3 rounded-sm bg-ink-surface/60 border border-black/[0.04]" data-testid={testid}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
        {wins && <span className="text-[9px] text-gold tracking-widest">VENCE</span>}
      </div>
      <div className="font-display text-2xl gold-text inline-flex items-center gap-2">
        {value}
        {good ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <X className="w-4 h-4 text-zinc-400" />
        )}
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{help}</div>
    </div>
  );
}

function ContrastMatrix({ A, B }) {
  // Mostra contraste entre cor base A x todas de B (e vice-versa)
  const baseA = A.colors[0];
  const baseB = B.colors[0];

  // Verifica se NENHUMA combinação A×B atinge WCAG AA (4.5:1)
  const maxPairContrast = useMemo(() => {
    let max = 0;
    for (const ca of A.colors) {
      for (const cb of B.colors) {
        const cr = contrastRatio(ca.hex, cb.hex);
        if (cr > max) max = cr;
      }
    }
    return max;
  }, [A, B]);
  const noAAPair = maxPairContrast < 4.5;

  return (
    <div className="mt-8 glass-strong rounded-sm p-6" data-testid="contrast-matrix">
      <div className="label-eyebrow text-gold mb-4 inline-flex items-center gap-2">
        <Eye className="w-3 h-3" /> Matriz de Contraste
      </div>

      {noAAPair && (
        <div
          className="mb-5 p-4 rounded-sm border border-amber-500/40 bg-amber-50/70 flex items-start gap-3"
          data-testid="compare-no-aa-warning"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-amber-900">
            <div className="font-semibold tracking-wide uppercase text-[10px] mb-1">
              Nenhuma combinação atinge contraste WCAG AA
            </div>
            <div className="text-amber-800">
              Ideal para peças decorativas, não para texto.
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <MatrixRow base={baseA} label={`Base A (${baseA.hex})`} colors={B.colors} testid="matrix-a-vs-b" />
        <MatrixRow base={baseB} label={`Base B (${baseB.hex})`} colors={A.colors} testid="matrix-b-vs-a" />
      </div>
    </div>
  );
}

function MatrixRow({ base, label, colors, testid }) {
  return (
    <div data-testid={testid}>
      <div className="text-xs text-zinc-600 mb-2 inline-flex items-center gap-2">
        <span
          className="inline-block w-4 h-4 rounded-sm border border-black/10"
          style={{ background: base.hex }}
        />
        {label}
      </div>
      <ul className="space-y-1.5">
        {colors.map((c) => {
          const cr = contrastRatio(base.hex, c.hex);
          const ok = cr >= 4.5;
          return (
            <li
              key={c.hex + c.role}
              className="flex items-center justify-between text-xs p-2 rounded-sm border border-black/[0.04]"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 rounded-sm border border-black/10"
                  style={{ background: c.hex }}
                />
                <span className="font-mono">{c.hex.toUpperCase()}</span>
              </span>
              <span className={`font-mono ${ok ? "text-emerald-600" : "text-zinc-500"}`}>
                {cr.toFixed(2)}:1 {ok ? "✓" : "·"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
