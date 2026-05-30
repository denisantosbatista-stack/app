import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, Play, ChevronDown, Menu, X, User, LogOut, LogIn } from "lucide-react";
import { toast } from "react-hot-toast";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Grupos do menu — agrupa 14 itens em 4 dropdowns + 2 links diretos
const NAV_GROUPS = [
  {
    id: "criar",
    label: "Criar",
    items: [
      { to: "/studio", label: "Studio" },
      { to: "/mixer", label: "Mixer" },
      { to: "/calculator", label: "Calculadora" },
    ],
  },
  {
    id: "aprender",
    label: "Aprender",
    items: [
      { to: "/mentora", label: "Mentora", ai: true },
      { to: "/tips", label: "Técnicas" },
      { to: "/library", label: "Biblioteca" },
    ],
  },
  {
    id: "comunidade",
    label: "Comunidade",
    items: [
      { to: "/feed", label: "Feed" },
      { to: "/challenges", label: "Desafios" },
      { to: "/marketplace", label: "Marketplace" },
    ],
  },
  {
    id: "conta",
    label: "Minha conta",
    items: [
      { to: "/collections", label: "Coleção", ai: true },
      { to: "/compare", label: "Comparador" },
      { to: "/planos", label: "Ver planos" },
      { to: "/privacy", label: "Privacidade" },
    ],
  },
];

const API_BASE = process.env.REACT_APP_BACKEND_URL;

async function handleDownloadSource() {
  const url = `${API_BASE}/api/download/source`;
  const t = toast.loading("Empacotando código-fonte…");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dispo = res.headers.get("content-disposition") || "";
    const match = /filename="?([^"]+)"?/i.exec(dispo);
    const filename = match ? match[1] : "lindart-source.zip";
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    toast.success("Download iniciado!", { id: t });
  } catch (e) {
    toast.error("Falha ao baixar o código.", { id: t });
    console.error("download error", e);
  }
}

function NavDropdown({ group }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const groupActive = group.items.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      data-testid={`nav-group-${group.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-sm tracking-wide transition-colors duration-300 ${
          groupActive || open ? "text-ink-text" : "text-zinc-600 hover:text-ink-text"
        }`}
        data-testid={`nav-group-btn-${group.id}`}
      >
        {group.label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-40"
            data-testid={`nav-dropdown-${group.id}`}
          >
            <div className="min-w-[190px] glass-strong border border-black/[0.08] rounded-sm shadow-[0_12px_32px_rgba(0,0,0,0.10)] p-1.5">
              {group.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors duration-200 ${
                      isActive
                        ? "bg-gold/10 text-ink-text"
                        : "text-zinc-700 hover:bg-gold/5 hover:text-ink-text"
                    }`
                  }
                  data-testid={`nav-link-${it.to.replace("/", "") || "home"}`}
                >
                  {it.ai && (
                    <span
                      aria-hidden
                      className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)]"
                    />
                  )}
                  {it.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const userMenuRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await logout();
    toast.success("Você saiu da sua conta.");
    setUserOpen(false);
    navigate("/");
  }

  const initials = user && typeof user === "object"
    ? (user.name || user.email || "?").trim().charAt(0).toUpperCase()
    : "?";

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

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm tracking-wide transition-colors duration-300 ${
                isActive ? "text-ink-text" : "text-zinc-600 hover:text-ink-text"
              }`
            }
            data-testid="nav-link-home"
          >
            Início
          </NavLink>
          {NAV_GROUPS.map((g) => (
            <NavDropdown key={g.id} group={g} />
          ))}
          <NavLink
            to="/trends"
            className={({ isActive }) =>
              `text-sm tracking-wide transition-colors duration-300 inline-flex items-center gap-1.5 ${
                isActive ? "text-ink-text" : "text-zinc-600 hover:text-ink-text"
              }`
            }
            data-testid="nav-link-trends"
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)]"
            />
            Tendências
          </NavLink>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/studio"
            className="btn-gold px-5 py-2.5 rounded-sm text-xs tracking-[0.18em] uppercase"
            data-testid="cta-studio-nav"
          >
            ✦ Criar Paleta
          </Link>
          <button
            type="button"
            onClick={handleDownloadSource}
            title="Baixar código-fonte (.zip)"
            aria-label="Baixar código-fonte do LindArt em ZIP"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors text-[10px] tracking-[0.22em] uppercase"
            data-testid="download-source-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Código
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("lindart:open-tour"))}
            title="Ver tour interativo"
            aria-label="Abrir tour interativo do LindArt"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors text-[10px] tracking-[0.22em] uppercase"
            data-testid="open-tour-btn"
          >
            <Play className="w-3.5 h-3.5" />
            Tour
          </button>

          {/* Auth area (desktop) */}
          {!loading && !isAuthenticated && (
            <div className="flex items-center gap-1.5 pl-1.5 ml-1 border-l border-zinc-300/70">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors text-[10px] tracking-[0.22em] uppercase"
                data-testid="navbar-login-btn"
              >
                <LogIn className="w-3.5 h-3.5" />
                Entrar
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-3 py-2 rounded-sm bg-ink-text text-bone hover:bg-ink transition-colors text-[10px] tracking-[0.22em] uppercase"
                data-testid="navbar-register-btn"
              >
                Cadastrar
              </Link>
            </div>
          )}
          {!loading && isAuthenticated && (
            <div ref={userMenuRef} className="relative pl-1.5 ml-1 border-l border-zinc-300/70" data-testid="navbar-user-menu">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-2 py-1.5 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                data-testid="navbar-user-btn"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-gold-hover via-gold to-gold-deep text-ink text-xs font-semibold inline-flex items-center justify-center shadow-gold">
                  {initials}
                </span>
                <span className="hidden lg:inline text-[10px] tracking-[0.22em] uppercase max-w-[110px] truncate">
                  {user?.name || user?.handle || "Conta"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {userOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full pt-2 z-40"
                    data-testid="navbar-user-dropdown"
                  >
                    <div className="min-w-[220px] glass-strong border border-black/[0.08] rounded-sm shadow-[0_12px_32px_rgba(0,0,0,0.10)] p-1.5">
                      <div className="px-3 py-2 border-b border-black/[0.06] mb-1">
                        <div className="text-sm text-ink-text truncate" data-testid="navbar-user-name">
                          {user?.name || "Conta"}
                        </div>
                        <div className="text-[10px] tracking-wide text-zinc-500 truncate" data-testid="navbar-user-email">
                          {user?.email}
                        </div>
                      </div>
                      <NavLink
                        to="/collections"
                        className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-zinc-700 hover:bg-gold/5 hover:text-ink-text transition-colors"
                        data-testid="navbar-user-collections"
                      >
                        <User className="w-3.5 h-3.5 text-gold" />
                        Minha coleção
                      </NavLink>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-zinc-700 hover:bg-gold/5 hover:text-ink-text transition-colors"
                        data-testid="navbar-logout-btn"
                      >
                        <LogOut className="w-3.5 h-3.5 text-gold" />
                        Sair
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-sm border border-black/10 text-ink-text"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Abrir menu"
          data-testid="mobile-menu-toggle"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden border-t border-black/[0.06] bg-bone/95 backdrop-blur-md overflow-hidden"
            data-testid="mobile-menu"
          >
            <div className="px-6 py-4 space-y-4">
              <NavLink
                to="/"
                end
                className="block text-sm tracking-wide text-zinc-700"
                data-testid="mobile-nav-link-home"
              >
                Início
              </NavLink>
              <NavLink
                to="/trends"
                className="block text-sm tracking-wide text-zinc-700 inline-flex items-center gap-1.5"
                data-testid="mobile-nav-link-trends"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                Tendências
              </NavLink>
              {NAV_GROUPS.map((g) => (
                <div key={g.id} className="space-y-1.5">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-gold">{g.label}</div>
                  <div className="pl-3 space-y-1.5 border-l border-gold/30">
                    {g.items.map((it) => (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        className="block text-sm text-zinc-700 hover:text-ink-text"
                        data-testid={`mobile-nav-link-${it.to.replace("/", "") || "home"}`}
                      >
                        {it.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
              <Link
                to="/studio"
                className="btn-gold inline-flex px-5 py-2.5 rounded-sm text-xs tracking-[0.18em] uppercase"
                data-testid="mobile-cta-studio"
              >
                ✦ Criar Paleta
              </Link>

              {/* Auth area (mobile) */}
              <div className="pt-3 mt-2 border-t border-black/[0.06] space-y-2">
                {!loading && !isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm border border-zinc-300/70 text-zinc-700 text-[10px] tracking-[0.22em] uppercase"
                      data-testid="mobile-navbar-login-btn"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Entrar
                    </Link>
                    <Link
                      to="/register"
                      className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-sm bg-ink-text text-bone text-[10px] tracking-[0.22em] uppercase"
                      data-testid="mobile-navbar-register-btn"
                    >
                      Cadastrar
                    </Link>
                  </div>
                )}
                {!loading && isAuthenticated && (
                  <div className="space-y-2" data-testid="mobile-navbar-user-section">
                    <div className="flex items-center gap-3 px-1">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-hover via-gold to-gold-deep text-ink text-sm font-semibold inline-flex items-center justify-center shadow-gold">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm text-ink-text truncate" data-testid="mobile-navbar-user-name">
                          {user?.name || "Conta"}
                        </div>
                        <div className="text-[10px] tracking-wide text-zinc-500 truncate" data-testid="mobile-navbar-user-email">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm border border-zinc-300/70 text-zinc-700 text-[10px] tracking-[0.22em] uppercase"
                      data-testid="mobile-navbar-logout-btn"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
