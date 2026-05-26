// Presets de paletas premium para resina epóxi
export const PRESET_PALETTES = [
  {
    id: "rose-suave",
    name: "Rosê Suave",
    description: "Quartzo rosa & creme",
    style: "floral",
    tags: ["feminino", "delicado", "boho"],
    colors: [
      { hex: "#F2D4D4", name: "Quartzo", role: "principal" },
      { hex: "#E8B4B8", name: "Rosé Antigo", role: "acento" },
      { hex: "#FFF5F5", name: "Pétala", role: "detalhe" },
      { hex: "#C8A0A8", name: "Veio Rosa", role: "veios" },
    ],
  },
  {
    id: "geodo-imperial",
    name: "Geodo Imperial",
    description: "Creme & dourado rosê",
    style: "geodo",
    tags: ["luxo", "metálico", "geodo"],
    colors: [
      { hex: "#F5E6D3", name: "Pérola", role: "principal" },
      { hex: "#D4AF37", name: "Dourado", role: "acento" },
      { hex: "#FFFAF0", name: "Marfim", role: "detalhe" },
      { hex: "#8B6F47", name: "Bronze", role: "veios" },
    ],
  },
  {
    id: "lavanda-bruma",
    name: "Lavanda Bruma",
    description: "Lilás etéreo & névoa",
    style: "pastel",
    tags: ["pastel", "etéreo", "calmo"],
    colors: [
      { hex: "#D8C9E0", name: "Lavanda", role: "principal" },
      { hex: "#B19CD9", name: "Lilás", role: "acento" },
      { hex: "#F5F0FA", name: "Névoa", role: "detalhe" },
      { hex: "#7A6B8C", name: "Sombra Lilás", role: "veios" },
    ],
  },
  {
    id: "branco-cristal",
    name: "Branco Cristal",
    description: "Pureza translúcida",
    style: "minimalista",
    tags: ["clean", "puro", "minimalista"],
    colors: [
      { hex: "#FFFFFF", name: "Cristal", role: "principal" },
      { hex: "#E8E8E8", name: "Pérola", role: "acento" },
      { hex: "#F5F5F5", name: "Neve", role: "detalhe" },
      { hex: "#C0C0C0", name: "Prata", role: "veios" },
    ],
  },
  {
    id: "pessego-aurora",
    name: "Pêssego Aurora",
    description: "Pêssego & dourado",
    style: "luxo",
    tags: ["quente", "luminoso", "sunset"],
    colors: [
      { hex: "#FFCBA4", name: "Pêssego", role: "principal" },
      { hex: "#E8A87C", name: "Coral Suave", role: "acento" },
      { hex: "#FFF1E6", name: "Creme", role: "detalhe" },
      { hex: "#C9A44A", name: "Dourado", role: "veios" },
    ],
  },
  {
    id: "menta-pastel",
    name: "Menta Pastel",
    description: "Verde suave & pérola",
    style: "pastel",
    tags: ["fresco", "suave", "spring"],
    colors: [
      { hex: "#C5E8D5", name: "Menta", role: "principal" },
      { hex: "#A8D5BA", name: "Eucalipto", role: "acento" },
      { hex: "#F0FAF4", name: "Branco Menta", role: "detalhe" },
      { hex: "#6B8E7F", name: "Sálvia", role: "veios" },
    ],
  },
  {
    id: "ametista-pastel",
    name: "Ametista Pastel",
    description: "Roxo delicado & lilás",
    style: "pastel",
    tags: ["místico", "delicado", "ametista"],
    colors: [
      { hex: "#C9B4DD", name: "Ametista Clara", role: "principal" },
      { hex: "#A084C7", name: "Ametista", role: "acento" },
      { hex: "#F0E6F7", name: "Brilho Lilás", role: "detalhe" },
      { hex: "#6A5396", name: "Veio Profundo", role: "veios" },
    ],
  },
  {
    id: "azul-celeste",
    name: "Azul Celeste",
    description: "Céu suave & névoa",
    style: "oceano",
    tags: ["sereno", "céu", "calmo"],
    colors: [
      { hex: "#B8D4E8", name: "Céu", role: "principal" },
      { hex: "#7FA9C9", name: "Azul Bruma", role: "acento" },
      { hex: "#EAF4FA", name: "Névoa Clara", role: "detalhe" },
      { hex: "#4A6B8C", name: "Mar Profundo", role: "veios" },
    ],
  },
  {
    id: "marmore-preto",
    name: "Mármore Preto",
    description: "Onyx & veios dourados",
    style: "marmore",
    tags: ["luxo", "drama", "marmore"],
    colors: [
      { hex: "#1A1A1A", name: "Onyx", role: "principal" },
      { hex: "#2D2D2D", name: "Carvão", role: "acento" },
      { hex: "#404040", name: "Grafite", role: "detalhe" },
      { hex: "#D4AF37", name: "Veio Dourado", role: "veios" },
    ],
  },
  {
    id: "oceano-profundo",
    name: "Oceano Profundo",
    description: "Abissal & turquesa",
    style: "oceano",
    tags: ["oceano", "profundidade", "azul"],
    colors: [
      { hex: "#003049", name: "Abismo", role: "principal" },
      { hex: "#00798C", name: "Turquesa Profunda", role: "acento" },
      { hex: "#A7D8DE", name: "Espuma", role: "detalhe" },
      { hex: "#E8F4F7", name: "Cristal Marinho", role: "veios" },
    ],
  },
  {
    id: "ambar-luxo",
    name: "Âmbar Luxo",
    description: "Calor dourado & topázio",
    style: "luxo",
    tags: ["âmbar", "calor", "luxo"],
    colors: [
      { hex: "#8B4513", name: "Âmbar Profundo", role: "principal" },
      { hex: "#D4A574", name: "Topázio", role: "acento" },
      { hex: "#FFE4B5", name: "Mel", role: "detalhe" },
      { hex: "#5C2E0F", name: "Conhaque", role: "veios" },
    ],
  },
  {
    id: "galaxia-cosmica",
    name: "Galáxia Cósmica",
    description: "Nebulosa & estrelas",
    style: "galaxia",
    tags: ["espaço", "místico", "estrelado"],
    colors: [
      { hex: "#1B1340", name: "Espaço Profundo", role: "principal" },
      { hex: "#6B4E9B", name: "Nebulosa", role: "acento" },
      { hex: "#E8D5F2", name: "Poeira Estelar", role: "detalhe" },
      { hex: "#D4AF37", name: "Estrelas", role: "veios" },
    ],
  },
];

export const STYLES = [
  { id: "geodo", label: "Geodo", description: "Cristais + bordas brutas" },
  { id: "marmore", label: "Mármore", description: "Veios fluidos" },
  { id: "oceano", label: "Oceano", description: "Ondas líquidas" },
  { id: "galaxia", label: "Galáxia", description: "Nebulosa + glitter" },
  { id: "floral", label: "Floral", description: "Suave + orgânico" },
  { id: "metalico", label: "Metálico", description: "Mica + brilho" },
  { id: "acido", label: "Ácido", description: "Vibrante + neon" },
  { id: "pastel", label: "Pastel", description: "Delicado + leve" },
  { id: "boho", label: "Boho", description: "Terroso + natural" },
  { id: "luxo", label: "Luxo", description: "Dourado + profundidade" },
];

export const PIECES = [
  { id: "pingente-gota", label: "Pingente Gota", shape: "drop" },
  { id: "pingente-geo", label: "Pingente Geo", shape: "hex" },
  { id: "anel", label: "Anel", shape: "ring" },
  { id: "brinco-oval", label: "Brinco Oval", shape: "oval" },
  { id: "bracelete", label: "Bracelete", shape: "bracelet" },
  { id: "porta-joias", label: "Porta-joias", shape: "tray" },
  { id: "chaveiro", label: "Chaveiro", shape: "circle" },
  { id: "coracao", label: "Coração", shape: "heart" },
  { id: "folha", label: "Folha", shape: "leaf" },
  { id: "marcador", label: "Marcador", shape: "bookmark" },
];

export const MOCKUPS = [
  {
    id: "clock",
    label: "Relógio de Resina",
    url: "https://static.prod-images.emergentagent.com/jobs/41d44dae-5333-4203-8fd5-800873a4aea3/images/8893dddb4a4aac3825178ef63fb561d03bf9657d31147ff1186f4f936a86c88a.png",
  },
  {
    id: "tray",
    label: "Bandeja Premium",
    url: "https://static.prod-images.emergentagent.com/jobs/41d44dae-5333-4203-8fd5-800873a4aea3/images/7b2d1ab81e6fd84987bce59f1a7c322fdd889a3b38785c1a0285fbbe2e417bfd.png",
  },
  {
    id: "geode",
    label: "Geodo Decorativo",
    url: "https://static.prod-images.emergentagent.com/jobs/41d44dae-5333-4203-8fd5-800873a4aea3/images/558457381e345cb3c1c6c3d72bdad5af5a5268bc28780fa0de83d250e614c681.png",
  },
];

export const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/41d44dae-5333-4203-8fd5-800873a4aea3/images/85037f386f3c11bcbef00a23d72dd4714fccca1c20bc8bf141bab79348b3aa42.png";
