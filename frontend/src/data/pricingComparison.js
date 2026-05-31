import { Palette, Brain, Video, ShoppingBag, Trophy } from "lucide-react";

/**
 * Tabela comparativa de features por plano.
 * Valores aceitos por célula:
 *   - true       → ícone de check dourado
 *   - false / "—" → ícone de minus cinza
 *   - string      → texto literal (ex.: "5/mês", "Ilimitado")
 */
export const COMPARISON = [
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
      { label: "Mentoria IA (mensagens/mês)", livre: "—", essencial: "50", pro: "Ilimitado", studio: "Ilimitado" },
      { label: "Coleções geradas por IA", livre: false, essencial: true, pro: true, studio: true },
      { label: "Tendências da semana", livre: false, essencial: true, pro: true, studio: true },
      { label: "Visualizador 3D (Nano Banana)", livre: false, essencial: "5/mês", pro: "Ilimitado", studio: "Ilimitado" },
    ],
  },
  {
    group: "Vídeo & Compartilhamento",
    icon: Video,
    rows: [
      { label: "Vídeos IA (Fal.ai)", livre: false, essencial: false, pro: "20/mês", studio: "Ilimitado" },
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
