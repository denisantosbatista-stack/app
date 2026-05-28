import { NavLink } from "react-router-dom";
import { Home, Palette, Heart, GitCompare } from "lucide-react";

// Mobile mantém apenas 4 itens principais para deixar espaço ao badge fixo
// "Made with Emergent" no canto inferior direito da plataforma de preview.
// "Custo" e "Dicas" ficam acessíveis pelo header desktop.
const items = [
  { to: "/", icon: Home, label: "Início", end: true },
  { to: "/studio", icon: Palette, label: "Studio" },
  { to: "/library", icon: Heart, label: "Salvos" },
  { to: "/compare", icon: GitCompare, label: "A/B" },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-strong border-t border-black/[0.08] pl-3 pr-3 pt-2 pb-3"
      data-testid="mobile-nav"
    >
      <ul className="flex justify-start items-center gap-1 max-w-[180px]">
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to} className="flex-1 min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1.5 transition-colors ${
                  isActive ? "text-gold" : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`mobile-nav-${to.replace("/", "") || "home"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-wider uppercase">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
