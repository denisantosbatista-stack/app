import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/studio", label: "Studio" },
  { to: "/library", label: "Biblioteca" },
  { to: "/calculator", label: "Proporções" },
  { to: "/tips", label: "Técnicas" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 glass-strong border-b border-black/[0.06]"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        <Link to="/" className="group flex items-center gap-3" data-testid="logo-link">
          <div className="relative w-9 h-9 rounded-sm overflow-hidden flex items-center justify-center bg-gradient-to-br from-gold-hover via-gold to-gold-deep shadow-gold">
            <Sparkles className="w-4 h-4 text-ink relative z-10" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-tight gold-shimmer">LindArt</div>
            <div className="text-[10px] tracking-[0.32em] uppercase text-zinc-600 -mt-0.5">
              Studio Premium
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm tracking-wide transition-colors duration-300 relative ${
                  isActive ? "text-ink-text" : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`nav-link-${l.to.replace("/", "") || "home"}`}
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/studio"
          className="hidden md:inline-flex btn-gold px-5 py-2.5 rounded-sm text-xs tracking-[0.18em] uppercase"
          data-testid="cta-studio-nav"
        >
          ✦ Criar Paleta
        </Link>
      </div>
    </motion.header>
  );
}
