import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Download, Play } from "lucide-react";
import { toast } from "react-hot-toast";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/studio", label: "Studio" },
  { to: "/mentora", label: "Mentora", ai: true },
  { to: "/trends", label: "Tendências", ai: true },
  { to: "/collections", label: "Coleções", ai: true },
  { to: "/library", label: "Biblioteca" },
  { to: "/mixer", label: "Mixer" },
  { to: "/calculator", label: "Proporções" },
  { to: "/compare", label: "Comparar" },
  { to: "/tips", label: "Técnicas" },
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

        <nav className="hidden md:flex items-center gap-5 lg:gap-7">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm tracking-wide transition-colors duration-300 relative inline-flex items-center gap-1.5 ${
                  isActive ? "text-ink-text" : "text-zinc-600 hover:text-ink-text"
                }`
              }
              data-testid={`nav-link-${l.to.replace("/", "") || "home"}`}
            >
              {({ isActive }) => (
                <>
                  {l.ai && (
                    <span
                      aria-hidden
                      className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)]"
                    />
                  )}
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

        <button
          type="button"
          onClick={handleDownloadSource}
          title="Baixar código-fonte (.zip)"
          aria-label="Baixar código-fonte do LindArt em ZIP"
          className="hidden md:inline-flex items-center gap-2 ml-3 px-3 py-2 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors text-[10px] tracking-[0.22em] uppercase"
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
          className="hidden md:inline-flex items-center gap-2 ml-2 px-3 py-2 rounded-sm border border-zinc-300/70 text-zinc-700 hover:text-ink-text hover:border-gold hover:bg-gold/5 transition-colors text-[10px] tracking-[0.22em] uppercase"
          data-testid="open-tour-btn"
        >
          <Play className="w-3.5 h-3.5" />
          Tour
        </button>
      </div>
    </motion.header>
  );
}
