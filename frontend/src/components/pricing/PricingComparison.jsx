import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, ChevronDown } from "lucide-react";
import { PLANS } from "../../data/pricingPlans";
import { COMPARISON } from "../../data/pricingComparison";

/**
 * Seção "O que cada plano destrava" — tabela desktop + accordion mobile.
 * Lê PLANS (ordem das colunas) e COMPARISON (grupos e linhas) dos módulos de data.
 */
export default function PricingComparison() {
  const [openGroup, setOpenGroup] = useState(0);

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 bg-white/60 border-y border-black/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="text-left md:text-center mb-10 md:mb-14">
          <div className="label-eyebrow mb-3 flex md:justify-center items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
            Compare tudo, lado a lado
          </div>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">
            O que cada plano destrava
          </h2>
          <p className="mt-3 text-base md:text-lg text-ink-muted max-w-2xl md:mx-auto">
            Tudo o que você ganha em cada plano — sem letras miúdas.
          </p>
        </div>

        {/* DESKTOP: tabela */}
        <div className="hidden md:block overflow-hidden rounded-md border border-black/[0.08] bg-white shadow-soft">
          <table className="w-full text-left" data-testid="pricing-comparison-table">
            <thead>
              <tr className="bg-ink-elevated border-b border-black/[0.06]">
                <th className="py-4 px-5 text-[10px] tracking-[0.22em] uppercase text-zinc-500 font-medium w-[34%]">
                  Recurso
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`py-4 px-3 text-center text-[10px] tracking-[0.22em] uppercase font-medium ${
                      p.highlight ? "text-gold-deep" : "text-zinc-600"
                    }`}
                  >
                    {p.name}
                    {p.highlight && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)] align-middle" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((group) => (
                <React.Fragment key={group.group}>
                  <tr className="bg-gold/[0.04] border-b border-black/[0.04]">
                    <td colSpan={5} className="py-3 px-5">
                      <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-gold-deep">
                        <group.icon className="w-3.5 h-3.5" />
                        {group.group}
                      </div>
                    </td>
                  </tr>
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`${group.group}-${ri}`}
                      className="border-b border-black/[0.04] last:border-b-0 hover:bg-gold/[0.03] transition-colors"
                    >
                      <td className="py-3.5 px-5 text-sm text-zinc-700">{row.label}</td>
                      <td className="py-3.5 px-3 text-center"><Cell value={row.livre} /></td>
                      <td className="py-3.5 px-3 text-center"><Cell value={row.essencial} /></td>
                      <td className="py-3.5 px-3 text-center bg-gold/[0.03]">
                        <Cell value={row.pro} />
                      </td>
                      <td className="py-3.5 px-3 text-center"><Cell value={row.studio} /></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE: accordion */}
        <div className="md:hidden space-y-3" data-testid="pricing-comparison-mobile">
          {COMPARISON.map((group, gi) => {
            const isOpen = openGroup === gi;
            return (
              <div
                key={group.group}
                className="rounded-md bg-white border border-black/[0.08] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? -1 : gi)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                  aria-expanded={isOpen}
                  data-testid={`pricing-mobile-group-${gi}`}
                >
                  <span className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-gold-deep">
                    <group.icon className="w-3.5 h-3.5" />
                    {group.group}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 transition-transform ${
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
                      className="overflow-hidden border-t border-black/[0.05]"
                    >
                      <div className="divide-y divide-black/[0.04]">
                        {group.rows.map((row, ri) => (
                          <div key={ri} className="px-4 py-3">
                            <div className="text-sm text-zinc-700 mb-2">{row.label}</div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {PLANS.map((p) => (
                                <div
                                  key={p.id}
                                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-sm ${
                                    p.highlight ? "bg-gold/[0.07]" : "bg-black/[0.02]"
                                  }`}
                                >
                                  <span className="text-[9px] tracking-[0.18em] uppercase text-zinc-500">
                                    {p.name}
                                  </span>
                                  <Cell value={row[p.id]} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
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

function Cell({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gold/12 text-gold">
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false || value === "—") {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.04] text-zinc-400">
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  }
  return <span className="text-sm text-ink-text font-medium">{value}</span>;
}
