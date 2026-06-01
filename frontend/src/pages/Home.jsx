import Hero from "@/components/Hero";
import TrendingPalettes from "@/components/TrendingPalettes";
import MockupShowcase from "@/components/MockupShowcase";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div data-testid="home-page">
      <Hero />

      {/* Marquee de inspiração */}
      <div className="overflow-hidden border-y border-black/[0.04] py-12 bg-ink-surface/50">
        <div className="flex gap-10 animate-marquee whitespace-nowrap text-zinc-500 text-xs tracking-[0.32em] uppercase">
          {["a", "b"].map((rep) => (
            <div key={`marquee-${rep}`} className="flex gap-10">
              {["Resina Premium", "✦", "Paletas IA", "✦", "Geodos & Mármore", "✦", "Joalheria Artesanal", "✦", "Dourado Eterno", "✦", "Visualizador Líquido", "✦"].map((t, i) => (
                <span key={`${rep}-${i}-${t}`} className={i % 2 === 0 ? "text-zinc-700" : "text-gold"}>
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <TrendingPalettes />
      <MockupShowcase />

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-6 md:px-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative glass-strong rounded-sm overflow-hidden p-8 md:p-16 text-center"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <Sparkles className="w-6 h-6 text-gold mx-auto mb-5" />
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl tracking-tight leading-[1.05] mb-5">
              Comece a criar
              <br />
              <span className="italic gold-shimmer">em segundos</span>
            </h2>
            <p className="text-zinc-700 max-w-xl mx-auto mb-8 text-sm md:text-lg">
              Escreva um sentimento. Veja a IA materializar a paleta perfeita
              em peças reais de resina.
            </p>
            <Link
              to="/studio"
              className="btn-gold px-7 md:px-8 py-3.5 md:py-4 rounded-sm text-[11px] md:text-xs tracking-[0.22em] uppercase inline-flex items-center gap-2"
              data-testid="home-final-cta"
            >
              Abrir Studio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
