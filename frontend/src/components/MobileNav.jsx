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

// Mobile mostra TODAS as abas em scroll horizontal com fade lateral indicando
// que há mais conteúdo. Levantado acima do badge "Made with Emergent" (~64px)
// para evitar sobreposição visual com a barra de navegação.
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
      className="md:hidden fixed inset-x-0 z-50 glass-strong border-t border-black/[0.08] pt-2 pb-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      data-testid="mobile-nav"
    >
      {/* Fade indicador de scroll na direita */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10"
        style={{
          background:
            "linear-gradient(to left, rgba(255,255,255,0.85), rgba(255,255,255,0))",
        }}
      />
      <ul
        className="flex items-stretch gap-0.5 px-2 overflow-x-auto no-scrollbar snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to} className="shrink-0 snap-start">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-sm transition-colors min-w-[52px] ${
                  isActive
                    ? "text-gold bg-gold/5"
                    : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`mobile-nav-${to.replace("/", "") || "home"}`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[9px] tracking-[0.08em] uppercase whitespace-nowrap leading-tight">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
