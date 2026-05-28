import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Droplet, Sparkles, AlertCircle, DollarSign, Calculator as CalcIcon, TrendingUp } from "lucide-react";

const PRESETS = [
  { label: "Pingente", volume: 8 },
  { label: "Brinco par", volume: 4 },
  { label: "Anel", volume: 2 },
  { label: "Coaster", volume: 30 },
  { label: "Bandeja média", volume: 200 },
  { label: "Quadro grande", volume: 500 },
];

export default function Calculator() {
  const [mode, setMode] = useState("volume"); // volume | pricing

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-12" data-testid="calculator-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="label-eyebrow text-gold mb-3">Calculadora</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          Proporções <span className="italic gold-shimmer">precisas</span>
        </h1>
        <p className="text-zinc-600 mt-3 max-w-xl">
          Calcule resina, endurecedor, pigmento e <b>preço de venda</b> sem desperdícios.
        </p>
      </motion.div>

      <div className="flex gap-2 mb-6" role="tablist">
        <TabBtn active={mode === "volume"} onClick={() => setMode("volume")} icon={CalcIcon} label="Proporções" testid="calc-tab-volume" />
        <TabBtn active={mode === "pricing"} onClick={() => setMode("pricing")} icon={DollarSign} label="Precificação" testid="calc-tab-pricing" />
      </div>

      {mode === "volume" ? <VolumeMode /> : <PricingMode />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`px-4 py-2.5 rounded-sm text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2 transition-all ${
        active
          ? "bg-gold text-ink shadow-gold"
          : "border border-black/10 text-zinc-700 hover:border-gold/40"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function VolumeMode() {
  const [volume, setVolume] = useState(100);
  const [ratio, setRatio] = useState("2:1");
  const [pigment, setPigment] = useState(3);

  const [resinRatio, hardenerRatio] = ratio.split(":").map(Number);
  const total = resinRatio + hardenerRatio;
  const resinVolume = (volume * resinRatio) / total;
  const hardenerVolume = (volume * hardenerRatio) / total;
  const pigmentVolume = (volume * pigment) / 100;
  const resinWeight = resinVolume * 1.1;
  const hardenerWeight = hardenerVolume * 1.0;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
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
            <span className="text-sm text-zinc-600 w-12">ml</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setVolume(p.volume)}
                className="text-[10px] px-2.5 py-1 rounded-sm border border-black/10 text-zinc-700 hover:border-gold/40 uppercase tracking-wider"
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
                    : "border border-black/10 text-zinc-700 hover:border-gold/40"
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
            <span className="text-sm text-zinc-600">%</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 flex gap-1.5 items-start">
            <AlertCircle className="w-3 h-3 text-gold mt-0.5 shrink-0" />
            Recomendado: 2-5% para opacidade equilibrada. Acima de 6% pode afetar a cura.
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-sm p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="label-eyebrow text-gold">Resultado</span>
            <span className="text-[10px] text-zinc-500 tracking-wider uppercase">{volume}ml total</span>
          </div>

          <ResultRow icon={Droplet} label="Resina" volumeMl={resinVolume} weightG={resinWeight} accent="from-gold-hover to-gold" testid="result-resin" />
          <ResultRow icon={Droplet} label="Endurecedor" volumeMl={hardenerVolume} weightG={hardenerWeight} accent="from-zinc-200 to-zinc-400" testid="result-hardener" />
          <ResultRow icon={Sparkles} label="Pigmento" volumeMl={pigmentVolume} weightG={pigmentVolume * 1.1} accent="from-gold-deep to-gold-soft" testid="result-pigment" />

          <div className="pt-4 mt-2 border-t border-black/[0.06] grid grid-cols-2 gap-3">
            <Tip title="Tempo de mistura" desc="2-3 min lentos · evite bolhas" />
            <Tip title="Tempo de cura" desc="24-72h dependendo da resina" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingMode() {
  const [volume, setVolume] = useState(50);
  const [resinCost, setResinCost] = useState(0.45); // R$/ml de mistura final
  const [pigmentCost, setPigmentCost] = useState(2.0); // R$/ml de pigmento
  const [pigmentPct, setPigmentPct] = useState(3);
  const [packagingCost, setPackagingCost] = useState(5);
  const [extraCost, setExtraCost] = useState(0); // moldes/aplicações/etc
  const [hours, setHours] = useState(1.5);
  const [hourlyRate, setHourlyRate] = useState(40);
  const [markup, setMarkup] = useState(2.5);

  const calc = useMemo(() => {
    const pigmentVol = (volume * pigmentPct) / 100;
    const matResina = volume * resinCost;
    const matPigmento = pigmentVol * pigmentCost;
    const materialTotal = matResina + matPigmento + Number(packagingCost) + Number(extraCost);
    const trabalho = hours * hourlyRate;
    const custoTotal = materialTotal + trabalho;
    const precoVenda = custoTotal * markup;
    const lucro = precoVenda - custoTotal;
    const margemPct = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;
    return { matResina, matPigmento, materialTotal, trabalho, custoTotal, precoVenda, lucro, margemPct };
  }, [volume, resinCost, pigmentPct, pigmentCost, packagingCost, extraCost, hours, hourlyRate, markup]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass rounded-sm p-6 space-y-5">
        <NumberField label="Volume da peça (ml)" value={volume} setValue={setVolume} min={1} step={1} testid="price-volume" />
        <NumberField label="Custo da resina (R$/ml)" value={resinCost} setValue={setResinCost} min={0} step={0.05} testid="price-resin-cost" />
        <NumberField label="Pigmento (% do volume)" value={pigmentPct} setValue={setPigmentPct} min={0} max={10} step={0.5} testid="price-pigment-pct" />
        <NumberField label="Custo do pigmento (R$/ml)" value={pigmentCost} setValue={setPigmentCost} min={0} step={0.1} testid="price-pigment-cost" />
        <NumberField label="Embalagem (R$)" value={packagingCost} setValue={setPackagingCost} min={0} step={0.5} testid="price-packaging" />
        <NumberField label="Outros materiais (R$)" value={extraCost} setValue={setExtraCost} min={0} step={0.5} testid="price-extra" />
        <NumberField label="Horas de trabalho" value={hours} setValue={setHours} min={0} step={0.25} testid="price-hours" />
        <NumberField label="Valor da hora (R$)" value={hourlyRate} setValue={setHourlyRate} min={0} step={5} testid="price-hourly" />

        <div>
          <label className="label-eyebrow block mb-3">Markup (multiplicador)</label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 2.5, 3, 4].map((m) => (
              <button
                key={m}
                onClick={() => setMarkup(m)}
                className={`px-3 py-2.5 rounded-sm text-sm transition-all ${
                  markup === m
                    ? "bg-gold text-ink shadow-gold"
                    : "border border-black/10 text-zinc-700 hover:border-gold/40"
                }`}
                data-testid={`price-markup-${m}`}
              >
                {m}×
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 flex gap-1.5 items-start">
            <AlertCircle className="w-3 h-3 text-gold mt-0.5 shrink-0" />
            Mercado artesanal: 2.5–3× cobre risco, refugo e crescimento.
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-sm p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative space-y-4">
          <span className="label-eyebrow text-gold">Resultado da Precificação</span>

          <PriceRow label="Custo Resina" value={calc.matResina} testid="result-mat-resina" />
          <PriceRow label="Custo Pigmento" value={calc.matPigmento} testid="result-mat-pigmento" />
          <PriceRow label="Material Total" value={calc.materialTotal} bold testid="result-material-total" />
          <PriceRow label="Mão de obra" value={calc.trabalho} testid="result-trabalho" />

          <div className="border-t border-black/[0.08] pt-3 mt-2 space-y-2">
            <PriceRow label="Custo Total" value={calc.custoTotal} bold testid="result-custo-total" />
            <div
              className="p-4 rounded-sm bg-gradient-to-br from-gold-soft/40 to-gold/30 border border-gold/30 mt-1"
              data-testid="result-preco-venda"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-700 inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Preço de Venda Sugerido
                </span>
                <span className="font-display text-3xl gold-text">
                  R$ {calc.precoVenda.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-600">
                <span>Lucro: <b className="text-emerald-700">R$ {calc.lucro.toFixed(2)}</b></span>
                <span>Margem: <b className="text-emerald-700">{calc.margemPct.toFixed(1)}%</b></span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 pt-1">
            Salve esta paleta na biblioteca para vincular custos no futuro.
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, setValue, min = 0, max, step = 1, testid }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Number.isNaN(v)) v = min;
          if (typeof max === "number") v = Math.min(max, v);
          setValue(Math.max(min, v));
        }}
        className="w-full"
        data-testid={testid}
      />
    </div>
  );
}

function PriceRow({ label, value, bold, testid }) {
  return (
    <div className="flex items-center justify-between text-sm" data-testid={testid}>
      <span className={`${bold ? "text-ink-text" : "text-zinc-600"}`}>{label}</span>
      <span className={`${bold ? "font-display text-lg gold-text" : "font-mono text-zinc-700"}`}>
        R$ {value.toFixed(2)}
      </span>
    </div>
  );
}

function ResultRow({ icon: Icon, label, volumeMl, weightG, accent, testid }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-sm border border-black/[0.06] bg-ink-surface/50" data-testid={testid}>
      <div className={`w-10 h-10 rounded-sm bg-gradient-to-br ${accent} flex items-center justify-center text-ink`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-600">{label}</div>
        <div className="font-display text-2xl gold-text mt-0.5">{volumeMl.toFixed(1)} ml</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Peso</div>
        <div className="font-mono text-sm text-zinc-700">{weightG.toFixed(1)} g</div>
      </div>
    </div>
  );
}

function Tip({ title, desc }) {
  return (
    <div className="text-xs">
      <div className="text-gold tracking-wider uppercase text-[10px] mb-1">{title}</div>
      <div className="text-zinc-700">{desc}</div>
    </div>
  );
}
