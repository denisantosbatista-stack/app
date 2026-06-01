import { Sparkles, Palette, Crown, Layers } from "lucide-react";

/**
 * Planos do LindArt — preços mensais e anuais.
 *
 * Preços oficiais de LANÇAMENTO (Founders pricing) — congelados pra
 * sempre para as primeiras 100 assinantes. Após esgotarem as vagas,
 * os valores são reajustados para o padrão de mercado.
 *
 * Os preços anuais (annualMonthly / annualTotal) já estão definidos
 * para ativação futura. Quando o plano anual for liberado, basta trocar
 * ANNUAL_ENABLED para true em Pricing.jsx e o restante já está pronto.
 *
 * Math anual = mensal * 0.8 (20% off), arredondado para inteiro:
 *   Essencial: 47 → 38/mês  (451/ano)
 *   Pro:       97 → 78/mês  (931/ano)
 *   Studio:   197 → 158/mês (1891/ano)
 */
export const PLANS = [
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
    monthly: 47,
    annualMonthly: 38,
    annualTotal: 451,
    cta: "Assinar Essencial",
    ctaTo: "/register?plan=essencial",
    icon: Palette,
    highlight: false,
    badge: null,
    perks: [
      "30 paletas por mês",
      "Mentoria IA (50 mensagens/mês)",
      "Tendências da semana",
      "Postar no Feed e Marketplace",
      "Participar de Desafios",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quem vive da resina",
    monthly: 97,
    annualMonthly: 78,
    annualTotal: 931,
    cta: "Assinar Pro",
    ctaTo: "/register?plan=pro",
    icon: Crown,
    highlight: true,
    badge: "Mais popular",
    perks: [
      "Paletas ilimitadas",
      "Mentoria IA ilimitada",
      "Vídeo IA (20 gerações/mês)",
      "Coleções IA + Comparador A/B",
      "Perfil Verificado dourado",
      "Suporte prioritário",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Para estúdios e marcas",
    monthly: 197,
    annualMonthly: 158,
    annualTotal: 1891,
    cta: "Falar com vendas",
    ctaTo: "/register?plan=studio",
    icon: Layers,
    highlight: false,
    badge: null,
    perks: [
      "Tudo do Pro, sem limites",
      "Vídeo IA ilimitado",
      "Até 5 contas/colaboradores",
      "Marca branca no DNA Share",
      "Destaque no Marketplace",
      "Onboarding 1:1 com a equipe",
    ],
  },
];
