import { NavLink } from "react-router-dom";
import {
  Home,
  Palette,
  Beaker,
  TrendingUp,
  Brain,
  Users,
  Crown,
  User,
} from "lucide-react";

// Menu oficial — labels exatas conforme padrão LindArt.
// Mantido como scroll horizontal para caber em telas pequenas.
const items = [
  { to: "/", icon: Home, label: "Início", end: true },
  { to: "/studio", icon: Palette, label: "Studio" },
  { to: "/mixer", icon: Beaker, label: "Criar Paleta" },
  { to: "/trends", icon: TrendingUp, label: "Tendências", ai: true },
  { to: "/mentora", icon: Brain, label: "Aprender", ai: true },
  { to: "/feed", icon: Users, label: "Comunidade" },
  { to: "/planos", icon: Crown, label: "Planos" },
  { to: "/collections", icon: User, label: "Minha Conta" },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 glass-strong border-t border-black/[0.08] pt-2 pb-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
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
        {items.map(({ to, icon: Icon, label, end, ai }) => (
          <li key={to} className="shrink-0 snap-start">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-sm transition-colors min-w-[52px] ${
                  isActive
                    ? "text-gold bg-gold/5"
                    : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`mobile-nav-${to.replace("/", "") || "home"}`}
            >
              {ai && (
                <span
                  aria-hidden
                  className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_5px_rgba(212,178,96,0.8)]"
                />
              )}
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
