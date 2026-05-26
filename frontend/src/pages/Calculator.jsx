import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Droplet, Sparkles, AlertCircle } from "lucide-react";

export default function Calculator() {
  const [mode, setMode] = useState("volume"); // volume | jewelry | tray
  const [volume, setVolume] = useState(100); // ml
  const [ratio, setRatio] = useState("2:1"); // resin:hardener
  const [pigment, setPigment] = useState(3); // %

  // Calculations
  const [resinRatio, hardenerRatio] = ratio.split(":").map(Number);
  const total = resinRatio + hardenerRatio;
  const resinVolume = (volume * resinRatio) / total;
  const hardenerVolume = (volume * hardenerRatio) / total;
  const pigmentVolume = (volume * pigment) / 100;
  const resinWeight = resinVolume * 1.1; // ~1.1g/ml
  const hardenerWeight = hardenerVolume * 1.0;

  const presets = [
    { label: "Pingente", volume: 8 },
    { label: "Brinco par", volume: 4 },
    { label: "Anel", volume: 2 },
    { label: "Coaster", volume: 30 },
    { label: "Bandeja média", volume: 200 },
    { label: "Quadro grande", volume: 500 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-12" data-testid="calculator-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <div className="label-eyebrow text-gold mb-3">Calculadora</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          Proporções <span className="italic gold-shimmer">precisas</span>
        </h1>
        <p className="text-zinc-400 mt-3 max-w-xl">
          Calcule resina, endurecedor e pigmento sem desperdícios. Resultados em volume e peso.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="glass rounded-sm p-6 space-y-6">
          <div>
            <label className="label-eyebrow block mb-3">Volume total (ml)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={volume}
                onChange={(e) => setVolume(Math.max(1, Number(e.target.value) || 1))}
                className="w-28"
                data-testid="calc-volume-input"
              />
              <input
                type="range"
                min="1"
                max="1000"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-zinc-400 w-12">ml</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setVolume(p.volume)}
                  className="text-[10px] px-2.5 py-1 rounded-sm border border-white/10 text-zinc-300 hover:border-gold/40 uppercase tracking-wider"
                  data-testid={`calc-preset-${p.label}`}
                >
                  {p.label} ({p.volume}ml)
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-eyebrow block mb-3">Proporção resina : endurecedor</label>
            <div className="grid grid-cols-3 gap-2">
              {["1:1", "2:1", "3:1"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`px-3 py-2.5 rounded-sm text-sm transition-all ${
                    ratio === r
                      ? "bg-gold text-ink shadow-gold"
                      : "border border-white/10 text-zinc-300 hover:border-gold/40"
                  }`}
                  data-testid={`calc-ratio-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-eyebrow block mb-3">Pigmento (% do total)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={pigment}
                onChange={(e) => setPigment(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                className="w-24"
                data-testid="calc-pigment-input"
              />
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={pigment}
                onChange={(e) => setPigment(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-zinc-400">%</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 flex gap-1.5 items-start">
              <AlertCircle className="w-3 h-3 text-gold mt-0.5 shrink-0" />
              Recomendado: 2-5% para opacidade equilibrada. Acima de 6% pode afetar a cura.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="glass-strong rounded-sm p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label-eyebrow text-gold">Resultado</span>
              <span className="text-[10px] text-zinc-500 tracking-wider uppercase">{volume}ml total</span>
            </div>

            <ResultRow
              icon={Droplet}
              label="Resina"
              volumeMl={resinVolume}
              weightG={resinWeight}
              accent="from-gold-hover to-gold"
              testid="result-resin"
            />
            <ResultRow
              icon={Droplet}
              label="Endurecedor"
              volumeMl={hardenerVolume}
              weightG={hardenerWeight}
              accent="from-zinc-200 to-zinc-400"
              testid="result-hardener"
            />
            <ResultRow
              icon={Sparkles}
              label="Pigmento"
              volumeMl={pigmentVolume}
              weightG={pigmentVolume * 1.1}
              accent="from-gold-deep to-gold-soft"
              testid="result-pigment"
            />

            <div className="pt-4 mt-2 border-t border-white/[0.06] grid grid-cols-2 gap-3">
              <Tip title="Tempo de mistura" desc="2-3 min lentos · evite bolhas" />
              <Tip title="Tempo de cura" desc="24-72h dependendo da resina" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ icon: Icon, label, volumeMl, weightG, accent, testid }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-sm border border-white/[0.06] bg-ink-surface/50" data-testid={testid}>
      <div className={`w-10 h-10 rounded-sm bg-gradient-to-br ${accent} flex items-center justify-center text-ink`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <div className="font-display text-2xl gold-text mt-0.5">{volumeMl.toFixed(1)} ml</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Peso</div>
        <div className="font-mono text-sm text-zinc-200">{weightG.toFixed(1)} g</div>
      </div>
    </div>
  );
}

function Tip({ title, desc }) {
  return (
    <div className="text-xs">
      <div className="text-gold tracking-wider uppercase text-[10px] mb-1">{title}</div>
      <div className="text-zinc-300">{desc}</div>
    </div>
  );
}
