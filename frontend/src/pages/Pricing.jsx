import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Info,
} from "lucide-react";

import { PLANS } from "../data/pricingPlans";
import PricingComparison from "../components/pricing/PricingComparison";
import PricingFAQ from "../components/pricing/PricingFAQ";
import PricingBeforeAfter from "../components/pricing/PricingBeforeAfter";
import FoundersOffer from "../components/pricing/FoundersOffer";

/* Flag de ativação do plano anual (ver /app/frontend/src/data/pricingPlans.js).
   Quando o anual for liberado, trocar para true — o math já está pronto. */
const ANNUAL_ENABLED = false;


/* ──────────────────────────────────────────────────────────
   Helpers visuais
   ────────────────────────────────────────────────────────── */
function priceFormat(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/* ──────────────────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────────────────── */
export default function Pricing() {
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [tooltipOpen, setTooltipOpen] = useState(false);

  function handleAnnualClick() {
    if (ANNUAL_ENABLED) {
      setBilling("annual");
    } else {
      setTooltipOpen((v) => !v);
      window.setTimeout(() => setTooltipOpen(false), 3200);
    }
  }

  const showAnnual = billing === "annual" && ANNUAL_ENABLED;

  const plansView = useMemo(
    () =>
      PLANS.map((p) => ({
        ...p,
        displayPrice: showAnnual ? p.annualMonthly : p.monthly,
        annualHint: showAnnual ? `R$ ${priceFormat(p.annualTotal)} cobrados anualmente` : null,
      })),
    [showAnnual]
  );

  return (
    <div className="bg-ink text-ink-text" data-testid="pricing-page">
      {/* ───────── HERO ───────── */}
      <section className="relative px-6 md:px-10 pt-16 md:pt-24 pb-12 md:pb-16 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(212,175,55,0.18), transparent 55%), radial-gradient(ellipse at 80% 30%, rgba(184,149,74,0.10), transparent 55%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto text-left md:text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="label-eyebrow mb-5 flex md:justify-center items-center gap-2"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)]" />
            Planos & Preços
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
            data-testid="pricing-hero-title"
          >
            Escolha o plano que combina <br className="hidden md:block" />
            com o seu <span className="gold-shimmer">ateliê de resina</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-5 text-base md:text-lg text-ink-muted max-w-2xl md:mx-auto"
          >
            Comece grátis, sem cartão. Suba para Essencial, Pro ou Studio
            quando quiser destravar a IA, o vídeo IA e a comunidade
            verificada.
          </motion.p>

          {/* Toggle Mensal / Anual */}
          <div className="mt-9 md:mt-11 inline-flex flex-col items-start md:items-center gap-2 relative">
            <div
              className="inline-flex items-center p-1 rounded-full border border-black/10 bg-white/80 backdrop-blur-md shadow-soft"
              role="tablist"
              aria-label="Periodicidade de cobrança"
              data-testid="pricing-billing-toggle"
            >
              <button
                type="button"
                role="tab"
                aria-selected={billing === "monthly"}
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-xs tracking-[0.18em] uppercase transition-colors ${
                  billing === "monthly"
                    ? "bg-ink-text text-ink"
                    : "text-zinc-600 hover:text-ink-text"
                }`}
                data-testid="pricing-billing-monthly"
              >
                Mensal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showAnnual}
                aria-disabled={!ANNUAL_ENABLED}
                onClick={handleAnnualClick}
                onMouseEnter={() => !ANNUAL_ENABLED && setTooltipOpen(true)}
                onMouseLeave={() => !ANNUAL_ENABLED && setTooltipOpen(false)}
                title={
                  !ANNUAL_ENABLED
                    ? "Plano anual com 20% de desconto chegando em breve"
                    : undefined
                }
                className={`relative px-5 py-2 rounded-full text-xs tracking-[0.18em] uppercase inline-flex items-center gap-2 transition-colors ${
                  showAnnual
                    ? "bg-ink-text text-ink"
                    : "text-zinc-500 hover:text-ink-text/80 cursor-not-allowed"
                }`}
                data-testid="pricing-billing-annual"
              >
                Anual
                {!ANNUAL_ENABLED && (
                  <span
                    className="text-[9px] tracking-[0.22em] uppercase px-2 py-[3px] rounded-full bg-gold/15 text-gold-deep border border-gold/30"
                    data-testid="pricing-annual-badge"
                  >
                    Em breve
                  </span>
                )}
              </button>
            </div>

            {/* Tooltip do Anual */}
            <AnimatePresence>
              {tooltipOpen && !ANNUAL_ENABLED && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  role="tooltip"
                  className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-20 max-w-[280px]"
                  data-testid="pricing-annual-tooltip"
                >
                  <div className="rounded-md bg-ink-text text-ink px-3.5 py-2.5 text-xs leading-relaxed shadow-deep flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                    <span>
                      Plano anual com <strong className="text-gold">20% de desconto</strong> chegando em breve.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ───────── CARDS DE PLANO ───────── */}
      <section className="px-6 md:px-10 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {plansView.map((plan, idx) => {
            const Icon = plan.icon;
            const isHighlight = plan.highlight;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
                className={`relative rounded-lg p-6 md:p-7 flex flex-col ${
                  isHighlight
                    ? "bg-white shadow-gold-lg border-2 border-gold"
                    : "bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-soft"
                }`}
                data-testid={`pricing-card-${plan.id}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 rounded-full bg-gradient-to-r from-gold-hover via-gold to-gold-deep text-white text-[10px] tracking-[0.22em] uppercase shadow-gold"
                      data-testid={`pricing-badge-${plan.id}`}
                    >
                      ✦ {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-sm inline-flex items-center justify-center ${
                      isHighlight
                        ? "bg-gradient-to-br from-gold-hover via-gold to-gold-deep text-ink shadow-gold"
                        : "bg-gold/10 text-gold-deep"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display text-2xl leading-none">{plan.name}</div>
                    <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 mt-1">
                      {plan.tagline}
                    </div>
                  </div>
                </div>

                {/* Preço */}
                <div className="mt-6">
                  {plan.displayPrice === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-5xl leading-none">R$ 0</span>
                      <span className="text-sm text-ink-muted ml-2">para sempre</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base text-ink-muted">R$</span>
                        <span
                          className="font-display text-5xl leading-none"
                          data-testid={`pricing-price-${plan.id}`}
                        >
                          {priceFormat(plan.displayPrice)}
                        </span>
                        <span className="text-sm text-ink-muted ml-1">/mês</span>
                      </div>
                      {plan.annualHint && (
                        <div className="text-xs text-zinc-500 mt-1.5">{plan.annualHint}</div>
                      )}
                      {!showAnnual && ANNUAL_ENABLED === false && (
                        <div className="text-[11px] text-zinc-400 mt-1.5 italic">
                          No anual: R$ {priceFormat(plan.annualMonthly)}/mês (em breve)
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Lista de features */}
                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-zinc-700">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isHighlight ? "text-gold" : "text-gold-deep"
                        }`}
                        strokeWidth={2.5}
                      />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={plan.ctaTo}
                  className={`mt-7 inline-flex items-center justify-center w-full px-5 py-3 rounded-sm text-xs tracking-[0.22em] uppercase transition-all ${
                    isHighlight
                      ? "btn-gold"
                      : plan.id === "livre"
                      ? "bg-ink-text text-ink hover:bg-ink-text/90"
                      : "btn-outline-gold"
                  }`}
                  data-testid={`pricing-cta-${plan.id}`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Preços em reais (BRL). Sem trial enganoso, sem cobrança escondida — cancele quando quiser.
        </p>
      </section>

      {/* ───────── OFERTA FUNDADORAS ───────── */}
      <FoundersOffer />

      {/* ───────── ANTES / DEPOIS PRO ───────── */}
      <PricingBeforeAfter />

      {/* ───────── TABELA COMPARATIVA ───────── */}
      <PricingComparison />

      {/* ───────── FAQ ───────── */}
      <PricingFAQ />

      {/* ───────── CTA FINAL (FUNDO ESCURO) ───────── */}
      <section
        className="relative bg-ink-text text-ink overflow-hidden"
        data-testid="pricing-cta-final"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(212,175,55,0.22), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(184,149,74,0.18), transparent 55%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
          <div className="label-eyebrow mb-5 flex justify-center items-center gap-2 text-gold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,178,96,0.9)]" />
            Pronta pra começar?
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Sua próxima paleta favorita
            <br />
            está a <span className="gold-shimmer">um clique</span>.
          </h2>
          <p className="mt-5 text-base md:text-lg text-ink/70 max-w-xl mx-auto">
            Cria conta grátis em 30 segundos. Sem cartão, sem trial enganoso —
            só você, suas cores e a IA do LindArt.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="btn-gold px-7 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase"
              data-testid="pricing-cta-final-primary"
            >
              ✦ Começar grátis
            </Link>
            <Link
              to="/studio"
              className="px-7 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase border border-gold/40 text-ink hover:bg-gold/10 transition-colors"
              data-testid="pricing-cta-final-secondary"
            >
              Explorar o Studio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
