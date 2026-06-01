import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import CalculatorPanel from "@/components/CalculatorPanel";

// Mapeamento entre o segmento da URL e o modo interno da calculadora.
// Usado para que /calculadora/proporcoes, /calculadora/precificacao
// e /calculadora/medidas-3d abram diretamente na aba certa (compartilhável).
// `medidas` é mantido como alias legado e é normalizado para `medidas-3d`
// (URL canônica) pelo effect de sincronização abaixo.
const TAB_FROM_PATH = {
  proporcoes: "volume",
  precificacao: "pricing",
  "medidas-3d": "measure",
  medidas: "measure",
};
const PATH_FROM_TAB = {
  volume: "proporcoes",
  pricing: "precificacao",
  measure: "medidas-3d",
};

export default function Calculator() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const mode = TAB_FROM_PATH[tabParam] || "volume";

  // Normaliza alias legado `/calculadora/medidas` → `/calculadora/medidas-3d`.
  useEffect(() => {
    const expectedSlug = PATH_FROM_TAB[mode];
    if (tabParam && tabParam !== expectedSlug) {
      navigate(`/calculadora/${expectedSlug}`, { replace: true });
    }
  }, [mode, tabParam, navigate]);

  const handleModeChange = (next) => {
    const slug = PATH_FROM_TAB[next];
    if (slug && slug !== tabParam) {
      navigate(`/calculadora/${slug}`, { replace: false });
    }
  };

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

      <CalculatorPanel mode={mode} onModeChange={handleModeChange} />
    </div>
  );
}
