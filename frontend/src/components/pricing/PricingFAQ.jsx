import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQ } from "../../data/pricingFaq";

/**
 * Seção de perguntas frequentes da página /planos.
 * Inicializa com a primeira pergunta aberta (a que destaca o plano Livre grátis).
 */
export default function PricingFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section className="px-6 md:px-10 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-left md:text-center mb-10 md:mb-14">
          <div className="label-eyebrow mb-3 flex md:justify-center items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
            Perguntas frequentes
          </div>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">
            A gente explica antes de você perguntar
          </h2>
        </div>
        <div className="space-y-3" data-testid="pricing-faq">
          {FAQ.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-md bg-white border border-black/[0.08] overflow-hidden shadow-soft/50"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
                  aria-expanded={isOpen}
                  data-testid={`pricing-faq-q-${idx}`}
                >
                  <span className="font-display text-lg md:text-xl text-ink-text">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gold shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-5 pb-5 text-sm md:text-base text-zinc-600 leading-relaxed border-t border-black/[0.05] pt-4"
                        data-testid={`pricing-faq-a-${idx}`}
                      >
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
