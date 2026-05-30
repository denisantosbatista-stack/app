import {
  Package,
  GraduationCap,
  Sparkles,
  BookOpen,
  Wrench,
  ShoppingBag,
} from "lucide-react";

// Catálogo de categorias do marketplace. Compartilhado entre a página
// Marketplace.jsx (cards/filtros) e o CreateItemModal.jsx (chips de seleção).
export const MARKETPLACE_TYPES = [
  { id: "molde", label: "Moldes", icon: Package },
  { id: "curso", label: "Cursos", icon: GraduationCap },
  { id: "preset", label: "Presets", icon: Sparkles },
  { id: "ebook", label: "E-books", icon: BookOpen },
  { id: "ferramenta", label: "Ferramentas", icon: Wrench },
  { id: "outro", label: "Outros", icon: ShoppingBag },
];

export const MARKETPLACE_TYPE_LABEL = Object.fromEntries(
  MARKETPLACE_TYPES.map((t) => [t.id, t.label])
);
export const MARKETPLACE_TYPE_ICON = Object.fromEntries(
  MARKETPLACE_TYPES.map((t) => [t.id, t.icon])
);
