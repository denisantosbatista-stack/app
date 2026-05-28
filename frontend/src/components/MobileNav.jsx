import { NavLink } from "react-router-dom";
import { Home, Palette, Heart, Calculator, BookOpen, GitCompare } from "lucide-react";

const items = [
  { to: "/", icon: Home, label: "Início", end: true },
  { to: "/studio", icon: Palette, label: "Studio" },
  { to: "/library", icon: Heart, label: "Salvos" },
  { to: "/compare", icon: GitCompare, label: "A/B" },
  { to: "/calculator", icon: Calculator, label: "Custo" },
  { to: "/tips", icon: BookOpen, label: "Dicas" },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-strong border-t border-black/[0.08] px-3 pt-2 pb-3"
      data-testid="mobile-nav"
    >
      <ul className="flex justify-between items-center max-w-md mx-auto">
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to} className="flex-1">
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
