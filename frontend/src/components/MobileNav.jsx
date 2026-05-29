import { NavLink } from "react-router-dom";
import {
  Home,
  Palette,
  Heart,
  GitCompare,
  Beaker,
  Ruler,
  Sparkles,
} from "lucide-react";

// Mobile mostra TODAS as abas em scroll horizontal — mantém paridade com desktop
// e ainda deixa espaço (à direita) para o badge fixo "Made with Emergent".
const items = [
  { to: "/", icon: Home, label: "Início", end: true },
  { to: "/studio", icon: Palette, label: "Studio" },
  { to: "/library", icon: Heart, label: "Salvos" },
  { to: "/mixer", icon: Beaker, label: "Mixer" },
  { to: "/calculator", icon: Ruler, label: "Proporções" },
  { to: "/compare", icon: GitCompare, label: "A/B" },
  { to: "/tips", icon: Sparkles, label: "Técnicas" },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-strong border-t border-black/[0.08] pt-2 pb-3"
      data-testid="mobile-nav"
    >
      <ul
        className="flex items-center gap-1 px-3 pr-24 overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1.5 rounded-sm transition-colors min-w-[64px] ${
                  isActive
                    ? "text-gold bg-gold/5"
                    : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`mobile-nav-${to.replace("/", "") || "home"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-wider uppercase whitespace-nowrap">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
