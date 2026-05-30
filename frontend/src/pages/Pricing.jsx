import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Minus,
  Sparkles,
  Crown,
  Palette,
  Brain,
  Video,
  ShoppingBag,
  Trophy,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Estrutura de dados dos planos
   Preços anuais já estão definidos para ativação futura.
   Quando o plano anual for liberado, basta trocar
   ANNUAL_ENABLED para true e o restante já está pronto.
   ────────────────────────────────────────────────────────── */
const ANNUAL_ENABLED = false;

const PLANS = [
  {
    id: "livre",
    name: "Livre",
    tagline: "Para começar sem compromisso",
    monthly: 0,
    annualMonthly: 0,
    annualTotal: 0,
    cta: "Começar grátis",
    ctaTo: "/register",
    icon: Sparkles,
    highlight: false,
    badge: null,
    perks: [
      "5 paletas por mês",
      "Mixer e Calculadora",
      "Biblioteca de cores",
      "Feed e Marketplace (leitura)",
      "Acesso ao DNA Share",
    ],
  },
  {
    id: "essencial",
    name: "Essencial",
    tagline: "Para artistas que estão crescendo",
    monthly: 29,
    annualMonthly: 23,
    annualTotal: 278,
    cta: "Assinar Essencial",
    ctaTo: "/register?plan=essencial",
    icon: Palette,
    highlight: false,
    badge: null,
    perks: [
      "30 paletas por mês",
      "Mentora IA (50 mensagens/mês)",
      "Tendências da semana",
      "Postar no Feed e Marketplace",
      "Participar de Desafios",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quem vive da resina",
    monthly: 67,
    annualMonthly: 54,
    annualTotal: 643,
    cta: "Assinar Pro",
    ctaTo: "/register?plan=pro",
    icon: Crown,
    highlight: true,
    badge: "Mais popular",
    perks: [
      "Paletas ilimitadas",
      "Mentora IA ilimitada",
      "Vídeo SVD 2.0 (20 gerações/mês)",
      "Coleções IA + Comparador A/B",
      "Perfil Verificado dourado",
      "Suporte prioritário",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Para estúdios e marcas",
    monthly: 127,
    annualMonthly: 102,
    annualTotal: 1219,
    cta: "Falar com vendas",
    ctaTo: "/register?plan=studio",
    icon: Layers,
    highlight: false,
    badge: null,
    perks: [
      "Tudo do Pro, sem limites",
      "Vídeo SVD 2.0 ilimitado",
      "Até 5 contas/colaboradores",
      "Marca branca no DNA Share",
      "Destaque no Marketplace",
      "Onboarding 1:1 com a equipe",
    ],
  },
];

/* ──────────────────────────────────────────────────────────
   Tabela comparativa de features
   ────────────────────────────────────────────────────────── */
const COMPARISON = [
  {
    group: "Criação",
    icon: Palette,
    rows: [
      { label: "Paletas geradas por mês", livre: "5", essencial: "30", pro: "Ilimitado", studio: "Ilimitado" },
      { label: "Mixer de tintas", livre: true, essencial: true, pro: true, studio: true },
      { label: "Calculadora de proporções", livre: true, essencial: true, pro: true, studio: true },
      { label: "Comparador A/B", livre: false, essencial: true, pro: true, studio: true },
      { label: "Biblioteca de cores", livre: true, essencial: true, pro: true, studio: true },
    ],
  },
  {
    group: "Inteligência Artificial",
    icon: Brain,
    rows: [
      { label: "Mentora IA (mensagens/mês)", livre: "—", essencial: "50", pro: "Ilimitado", studio: "Ilimitado" },
      { label: "Coleções geradas por IA", livre: false, essencial: true, pro: true, studio: true },
      { label: "Tendências da semana", livre: false, essencial: true, pro: true, studio: true },
      { label: "Visualizador 3D (Nano Banana)", livre: false, essencial: "5/mês", pro: "Ilimitado", studio: "Ilimitado" },
    ],
  },
  {
    group: "Vídeo & Compartilhamento",
    icon: Video,
    rows: [
      { label: "Vídeos SVD 2.0 (Fal.ai)", livre: false, essencial: false, pro: "20/mês", studio: "Ilimitado" },
      { label: "DNA Share (link público)", livre: true, essencial: true, pro: true, studio: true },
      { label: "Marca branca no DNA", livre: false, essencial: false, pro: false, studio: true },
      { label: "Compartilhar no WhatsApp/IG", livre: true, essencial: true, pro: true, studio: true },
    ],
  },
  {
    group: "Comunidade",
    icon: ShoppingBag,
    rows: [
      { label: "Ler Feed e Marketplace", livre: true, essencial: true, pro: true, studio: true },
      { label: "Postar no Feed", livre: false, essencial: true, pro: true, studio: true },
      { label: "Anunciar no Marketplace", livre: false, essencial: true, pro: true, studio: true },
      { label: "Participar de Desafios", livre: false, essencial: true, pro: true, studio: true },
      { label: "Perfil Verificado dourado", livre: false, essencial: false, pro: true, studio: true },
      { label: "Destaque no Marketplace", livre: false, essencial: false, pro: false, studio: true },
    ],
  },
  {
    group: "Suporte & Time",
    icon: Trophy,
    rows: [
      { label: "Suporte por e-mail", livre: true, essencial: true, pro: true, studio: true },
      { label: "Suporte prioritário", livre: false, essencial: false, pro: true, studio: true },
      { label: "Onboarding 1:1", livre: false, essencial: false, pro: false, studio: true },
      { label: "Contas/colaboradores", livre: "1", essencial: "1", pro: "1", studio: "Até 5" },
    ],
  },
];

/* ──────────────────────────────────────────────────────────
   FAQ
   ────────────────────────────────────────────────────────── */
const FAQ = [
  {
    q: "O plano Livre é realmente grátis?",
    a: "Sim. O plano Livre é gratuito para sempre — sem cartão de crédito, sem trial que vira cobrança. Você pode criar até 5 paletas por mês, usar o Mixer, a Calculadora e ler tudo do Feed e do Marketplace sem pagar nada.",
  },
  {
    q: "Posso mudar ou cancelar meu plano quando quiser?",
    a: "Pode. Você troca de plano ou cancela direto na sua conta, sem multa e sem precisar falar com ninguém. Se cancelar, segue até o fim do ciclo já pago.",
  },
  {
    q: "Como vai funcionar o plano anual?",
    a: "Estamos finalizando. O plano anual vai dar 20% de desconto sobre o valor mensal e poderá ser pago à vista. Em breve liberamos — quem já é Essencial, Pro ou Studio receberá o upgrade automaticamente.",
  },
  {
    q: "Preciso de cartão para testar o LindArt?",
    a: "Não. O plano Livre não pede cartão. Você só informa um cartão quando decidir assinar Essencial, Pro ou Studio — e mesmo assim pode cancelar a qualquer momento.",
  },
  {
    q: "O vídeo SVD 2.0 está incluso em quais planos?",
    a: "O vídeo Stable Video Diffusion 2.0 (via Fal.ai) está disponível no Pro (20 gerações por mês) e no Studio (ilimitado). No Essencial e no Livre, você ainda usa imagem estática e o Mixer normalmente.",
  },
];

/* ──────────────────────────────────────────────────────────
   Helpers visuais
   ────────────────────────────────────────────────────────── */
function priceFormat(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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

/* ──────────────────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────────────────── */
export default function Pricing() {
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [openGroup, setOpenGroup] = useState(0); // accordion mobile

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
            quando quiser destravar a IA, o vídeo SVD 2.0 e a comunidade
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

      {/* ───────── TABELA COMPARATIVA ───────── */}
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
                  <>
                    <tr key={`g-${group.group}`} className="bg-gold/[0.04] border-b border-black/[0.04]">
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
                        <td className={`py-3.5 px-3 text-center ${"bg-gold/[0.03]"}`}>
                          <Cell value={row.pro} />
                        </td>
                        <td className="py-3.5 px-3 text-center"><Cell value={row.studio} /></td>
                      </tr>
                    ))}
                  </>
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

      {/* ───────── FAQ ───────── */}
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
