import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Beaker, Copy, ArrowLeftRight, Check, Sparkles, Wand2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { mixOklab, mixRgbLinear, deltaEOk } from "@/utils/lab";
import { copyToClipboard, isDark } from "@/utils/color";
import { usePaletteStore } from "@/store/usePaletteStore";
import MixerSwirl from "@/components/MixerSwirl";

const SUGGESTIONS = [
  { a: "#D4AF37", b: "#2C2C34", label: "Dourado × Onyx" },
  { a: "#E8C9D0", b: "#7E3F8F", label: "Rosa × Ametista" },
  { a: "#7CB7E8", b: "#E8E1D8", label: "Céu × Marfim" },
  { a: "#F5C4B4", b: "#26544F", label: "Pêssego × Esmeralda" },
  { a: "#FFFFFF", b: "#1A237E", label: "Branco × Marinho" },
];

export default function Mixer() {
  const [colorA, setColorA] = useState("#D4AF37");
  const [colorB, setColorB] = useState("#2C2C34");
  const [ratio, setRatio] = useState(50);
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();
  const savePalette = usePaletteStore((s) => s.savePalette);
  const setActivePalette = usePaletteStore((s) => s.setActivePalette);

  const t = 1 - ratio / 100;
  const mixedPerceptual = useMemo(() => mixOklab(colorA, colorB, t), [colorA, colorB, t]);
  const mixedLinear = useMemo(() => mixRgbLinear(colorA, colorB, t), [colorA, colorB, t]);
  const deltaE = useMemo(() => deltaEOk(colorA, colorB), [colorA, colorB]);

  // Gera 11 stops (0%, 10%, …, 100%) para mostrar o gradiente perceptual real
  const stops = useMemo(
    () => Array.from({ length: 11 }, (_, i) => ({
      pct: i * 10,
      hex: mixOklab(colorA, colorB, i / 10),
    })),
    [colorA, colorB]
  );

  const swap = () => {
    setColorA(colorB);
    setColorB(colorA);
    setRatio(100 - ratio);
  };

  const copyHex = (hex) => {
    copyToClipboard(hex);
    toast.success(`${hex} copiado`, { icon: "✦" });
  };

  // Aplica a mistura como paleta no Studio: 4 stops perceptuais (A, A→B 33%, A→B 67%, B)
  // Persiste via backend e marca como ativa, então navega para /studio.
  const applyMixToStudio = async () => {
    if (applying) return;
    setApplying(true);
    const id = toast.loading("Aplicando no Studio…", { icon: "✨" });
    try {
      const c0 = colorA.toUpperCase();
      const c1 = mixOklab(colorA, colorB, 1 / 3).toUpperCase();
      const c2 = mixOklab(colorA, colorB, 2 / 3).toUpperCase();
      const c3 = colorB.toUpperCase();
      const payload = {
        name: `Mistura Personalizada`,
        description: "Paleta criada no Misturador perceptual (OKLab)",
        colors: [
          { hex: c0, name: "Cor A", role: "principal" },
          { hex: c1, name: "Mistura 33%", role: "acento" },
          { hex: c2, name: "Mistura 67%", role: "detalhe" },
          { hex: c3, name: "Cor B", role: "veios" },
        ],
        style: "luxo",
        tags: ["mistura", "oklab"],
        favorite: false,
        source: "user",
      };
      const saved = await savePalette(payload);
      if (saved?.id) setActivePalette(saved.id);
      toast.success("Mistura aplicada", { id });
      navigate("/studio");
    } catch (e) {
      toast.error("Não foi possível aplicar. Tente novamente.", { id });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-12" data-testid="mixer-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <div className="label-eyebrow text-gold mb-3 inline-flex items-center gap-2">
          <Beaker className="w-3 h-3" /> Misturador Físico
        </div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          Mistura <span className="italic gold-shimmer">perceptual</span> (OKLab)
        </h1>
        <p className="text-zinc-600 mt-3 max-w-2xl">
          Veja como duas cores se fundem no <b>espaço perceptual OKLab</b> — sem aquela "lama
          cinza" que aparece em mistura RGB ingênua. Ajuste a proporção e copie o hex resultante.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Controles */}
        <div className="glass rounded-sm p-6 space-y-6">
          <ColorPicker label="Cor A" value={colorA} setValue={setColorA} testid="mixer-color-a" />
          <ColorPicker label="Cor B" value={colorB} setValue={setColorB} testid="mixer-color-b" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-eyebrow">Proporção (A → B)</label>
              <button
                onClick={swap}
                className="text-[10px] uppercase tracking-wider text-zinc-600 hover:text-gold inline-flex items-center gap-1.5"
                data-testid="mixer-swap"
              >
                <ArrowLeftRight className="w-3 h-3" /> Inverter
              </button>
            </div>

            {/* Slider customizado: fill cresce da ESQUERDA proporcional ao valor A */}
            <div className="relative pt-7 pb-1">
              {/* Percentual centralizado acima do thumb */}
              <div
                className="absolute top-0 pointer-events-none select-none"
                style={{
                  left: `${ratio}%`,
                  transform: "translateX(-50%)",
                }}
                data-testid="mixer-ratio-label"
              >
                <span className="text-[11px] font-mono text-gold font-semibold tracking-wider whitespace-nowrap">
                  {ratio}%
                </span>
              </div>

              {/* Track */}
              <div className="relative h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-150 ease-out"
                  style={{ width: `${ratio}%` }}
                  data-testid="mixer-ratio-fill"
                />
              </div>

              {/* Input range invisível, cobre toda a área do track */}
              <input
                type="range"
                min="0"
                max="100"
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="absolute left-0 right-0 top-7 h-2 w-full cursor-pointer opacity-0"
                aria-label="Proporção de Cor A"
                data-testid="mixer-ratio"
              />
            </div>

            <div className="flex justify-between text-[10px] uppercase tracking-[0.22em] text-zinc-600 mt-3 font-medium">
              <span data-testid="mixer-label-a">Cor A</span>
              <span data-testid="mixer-label-b">Cor B</span>
            </div>
          </div>

          <div>
            <div className="label-eyebrow mb-3">Pares sugeridos</div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setColorA(s.a); setColorB(s.b); }}
                  className="flex items-center gap-3 p-2 rounded-sm border border-black/10 hover:border-gold/40 transition-colors"
                  data-testid={`mixer-suggestion-${s.label.replace(/\s+/g, "-")}`}
                >
                  <div className="flex gap-1">
                    <span className="w-5 h-5 rounded-sm" style={{ background: s.a }} />
                    <span className="w-5 h-5 rounded-sm" style={{ background: s.b }} />
                  </div>
                  <span className="text-xs text-zinc-700 tracking-wide">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="glass-strong rounded-sm p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <span className="label-eyebrow text-gold">Resultado da mistura</span>
              <span className="text-[10px] font-mono text-zinc-500">ΔE ≈ {deltaE.toFixed(1)}</span>
            </div>

            <MixCard
              label="OKLab (perceptual)"
              hex={mixedPerceptual}
              onCopy={() => copyHex(mixedPerceptual)}
              accent
              testid="mixer-result-oklab"
            />
            <MixCard
              label="RGB linear (referência)"
              hex={mixedLinear}
              onCopy={() => copyHex(mixedLinear)}
              testid="mixer-result-rgb"
            />

            <button
              type="button"
              onClick={applyMixToStudio}
              disabled={applying}
              className="btn-gold w-full px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="mixer-apply-studio-btn"
            >
              {applying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {applying ? "Aplicando…" : "Aplicar mistura no Studio"}
            </button>

            <div className="p-3 rounded-sm bg-ink-surface/60 border border-black/[0.06] text-[11px] text-zinc-600 leading-relaxed">
              <Sparkles className="w-3 h-3 inline text-gold mr-1" />
              OKLab preserva luminância e tom como o olho percebe. Use para misturar pigmentos
              digitais sem perder saturação.
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <MixerSwirl colorA={colorA} colorB={colorB} />
      </div>

      {/* Gradiente de stops */}
      <div className="glass rounded-sm p-6">
        <div className="label-eyebrow mb-4">Espectro 0 → 100% (perceptual)</div>
        <div className="grid grid-cols-11 gap-px rounded-sm overflow-hidden" data-testid="mixer-spectrum">          {stops.map((s) => (
            <button
              key={s.pct}
              onClick={() => copyHex(s.hex)}
              className="group relative aspect-[3/4]"
              style={{ background: s.hex }}
              title={`${s.pct}% B · ${s.hex}`}
              data-testid={`mixer-stop-${s.pct}`}
            >
              <div className={`absolute inset-x-0 bottom-1 text-center text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
                isDark(s.hex) ? "text-white" : "text-ink"
              }`}>
                {s.hex.toUpperCase()}
              </div>
              <div className={`absolute top-1 left-1 text-[9px] font-mono ${isDark(s.hex) ? "text-white/70" : "text-ink/70"}`}>
                {s.pct}
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-3">
          Clique em qualquer stop para copiar o HEX.
        </p>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, setValue, testid }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    copyToClipboard(value);
    setCopied(true);
    toast.success(`${value} copiado`);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <label className="relative w-14 h-14 rounded-sm overflow-hidden border border-black/10 cursor-pointer shrink-0" style={{ background: value }}>
          <input
            type="color"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid={`${testid}-picker`}
          />
        </label>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#?[0-9a-fA-F]{6}$/.test(v)) setValue(v.startsWith("#") ? v : "#" + v);
            else if (v.startsWith("#")) setValue(v);
          }}
          className="flex-1 font-mono uppercase"
          data-testid={`${testid}-hex`}
        />
        <button
          onClick={onCopy}
          className="px-3 py-2.5 rounded-sm border border-black/10 hover:border-gold/40 text-zinc-700"
          data-testid={`${testid}-copy`}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function MixCard({ label, hex, onCopy, accent, testid }) {
  const dark = isDark(hex);
  return (
    <div
      className={`p-4 rounded-sm border ${accent ? "border-gold/30" : "border-black/[0.06]"}`}
      style={{ background: hex }}
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-[10px] uppercase tracking-[0.22em] ${dark ? "text-white/70" : "text-ink/70"}`}>
            {label}
          </div>
          <div className={`font-display text-3xl mt-1 ${dark ? "text-white" : "text-ink"}`}>
            {hex.toUpperCase()}
          </div>
        </div>
        <button
          onClick={onCopy}
          className={`px-3 py-2 rounded-sm text-[11px] uppercase tracking-wider transition-colors ${
            dark ? "bg-white/15 hover:bg-white/25 text-white" : "bg-ink/10 hover:bg-ink/20 text-ink"
          }`}
          data-testid={`${testid}-copy`}
        >
          <Copy className="w-3 h-3 inline mr-1" /> Copiar
        </button>
      </div>
    </div>
  );
}
