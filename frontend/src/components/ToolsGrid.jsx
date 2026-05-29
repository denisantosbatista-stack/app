import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Palette, FlaskConical, GitCompare, BookOpen, Heart, DollarSign, Ruler } from "lucide-react";

const tools = [
  { icon: Palette, title: "Paletas & Estilos", desc: "12 paletas premium · 10 estilos · IA generativa", to: "/studio", badge: "IA" },
  { icon: FlaskConical, title: "Calculadora de Proporções", desc: "Dosagem precisa de resina, endurecedor e pigmento", to: "/calculator" },
  { icon: Heart, title: "Biblioteca de Criações", desc: "Salve, organize e exporte todas suas paletas", to: "/library" },
  { icon: BookOpen, title: "Dicas & Técnicas", desc: "Guia completo de resina epóxi premium", to: "/tips" },
];

export default function ToolsGrid() {
  return (
    <section className="py-12 md:py-20 px-6 md:px-10 max-w-7xl mx-auto relative" data-testid="tools-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-8 md:mb-12"
      >
        <div className="label-eyebrow text-gold mb-3">Ferramentas</div>
        <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Tudo que você <span className="italic gold-shimmer">precisa</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <Link
              to={t.to}
              className="group block h-full relative overflow-hidden rounded-sm bg-ink-surface border border-black/[0.06] p-6 hover:border-gold/40 transition-all duration-500 hover:shadow-gold"
              data-testid={`tool-card-${t.to.replace("/", "")}`}
            >
              {t.badge && (
                <span className="absolute top-4 right-4 text-[9px] tracking-[0.2em] uppercase text-ink bg-gold px-2 py-0.5 rounded-sm">
                  {t.badge}
                </span>
              )}
              <div className="w-12 h-12 mb-5 rounded-sm flex items-center justify-center bg-gold/10 border border-gold/30 group-hover:bg-gold group-hover:text-ink transition-all duration-500 text-gold">
                <t.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl mb-2 tracking-tight">{t.title}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{t.desc}</p>
              <div className="mt-5 text-xs text-gold tracking-[0.2em] uppercase flex items-center gap-2">
                Acessar
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
