import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Wind, Droplet, Thermometer, Layers, Clock, Eye } from "lucide-react";

const tips = [
  {
    icon: Wind,
    title: "Ambiente",
    desc: "Trabalhe em local ventilado, sem poeira e com temperatura entre 22-25°C. Umidade baixa evita opacidade.",
    level: "Essencial",
  },
  {
    icon: Droplet,
    title: "Mistura sem bolhas",
    desc: "Misture devagar por 2-3 min em movimentos circulares. Use um soprador térmico para eliminar bolhas após verter.",
    level: "Pro",
  },
  {
    icon: Thermometer,
    title: "Cura controlada",
    desc: "Cubra a peça durante a cura. Calor acelera o processo, mas pode amarelar. Ideal: 24h em temperatura ambiente.",
    level: "Pro",
  },
  {
    icon: Layers,
    title: "Camadas profundas",
    desc: "Para peças com mais de 1cm de espessura, vaze em camadas de 5mm respeitando a cura parcial entre elas.",
    level: "Avançado",
  },
  {
    icon: Sparkles,
    title: "Pigmento certo",
    desc: "Use micas, pigmentos líquidos ou álcool em poucas gotas. Tinta acrílica pode interferir na cura.",
    level: "Essencial",
  },
  {
    icon: Clock,
    title: "Janela de trabalho",
    desc: "Após misturar, você tem ~30 min de pot life. Planeje cada vazamento e tenha o molde pronto.",
    level: "Essencial",
  },
  {
    icon: Eye,
    title: "Acabamento espelhado",
    desc: "Lixe progressivamente (400 → 2000) e finalize com polidor de plástico. Brilho de joalheria.",
    level: "Avançado",
  },
  {
    icon: AlertCircle,
    title: "Segurança",
    desc: "Luvas de nitrila, óculos e máscara para vapores. Resina não curada é irritante e sensibilizante.",
    level: "Crítico",
  },
];

const levelColor = {
  Essencial: "text-gold border-gold/40",
  Pro: "text-zinc-200 border-white/30",
  Avançado: "text-zinc-400 border-white/20",
  Crítico: "text-red-300 border-red-500/40",
};

export default function Tips() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-12" data-testid="tips-page">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <div className="label-eyebrow text-gold mb-3">Técnicas</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
          Maestria em <span className="italic gold-shimmer">resina epóxi</span>
        </h1>
        <p className="text-zinc-400 mt-3 max-w-xl">
          Princípios e dicas pro nível de joalheria, do preparo ao polimento.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tips.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="glass rounded-sm p-5 relative overflow-hidden group hover:shadow-gold transition-all duration-500"
            data-testid={`tip-${t.title}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-gold/10 border border-gold/30 text-gold">
                <t.icon className="w-4 h-4" />
              </div>
              <span className={`text-[9px] tracking-[0.22em] uppercase px-2 py-0.5 rounded-sm border ${levelColor[t.level]}`}>
                {t.level}
              </span>
            </div>
            <h3 className="font-display text-xl mb-2 tracking-tight">{t.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
