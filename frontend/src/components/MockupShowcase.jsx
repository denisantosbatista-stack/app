import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MOCKUPS } from "@/data/palettes";

export default function MockupShowcase() {
  const navigate = useNavigate();

  const goToStudio = (mockup) => {
    // A3 — Persiste a peça inspiradora em localStorage para hand-off ao Studio.
    try {
      localStorage.setItem(
        "lindart_piece_preview",
        JSON.stringify({
          pieceId: mockup.id,
          label: mockup.label,
          source: "mockup-showcase",
          ts: Date.now(),
        })
      );
    } catch {
      // ignora falha de storage (modo privado etc.)
    }
    navigate("/studio", {
      state: { pieceId: mockup.id, label: mockup.label, fromHome: true },
    });
  };

  const handleCardClick = (e, mockup) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    goToStudio(mockup);
  };

  return (
    <section
      className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto"
      data-testid="mockup-showcase"
    >
      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <div className="label-eyebrow text-gold mb-3">Inspiração real</div>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-[1.05]">
            Peças que <span className="italic gold-shimmer">encantam</span>
          </h2>
          <p className="text-zinc-600 mt-3 max-w-lg">
            Visualize como suas paletas podem renascer em peças tangíveis — desde
            relógios statement até bandejas de mármore dourado.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
        }}
        className="grid md:grid-cols-3 gap-6"
      >
        {MOCKUPS.map((m) => (
          <motion.div
            key={m.id}
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.94, filter: "blur(10px)" },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            whileHover={{ y: -10, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => handleCardClick(e, m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToStudio(m);
              }
            }}
            role="button"
            tabIndex={0}
            className="group relative overflow-hidden rounded-sm aspect-[4/3] cursor-pointer shadow-lg hover:shadow-gold-lg transition-shadow duration-700 focus:outline-none focus:ring-2 focus:ring-gold/60"
            data-testid={`mockup-${m.id}`}
            aria-label={`Abrir Studio — ${m.label}`}
          >
            {/* Imagem real da peça de resina */}
            <img
              src={m.url}
              alt={m.label}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110"
              data-testid={`mockup-image-${m.id}`}
            />

            {/* Overlay base (sempre visível, suave) */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

            {/* Overlay de hover — escurece + revela CTA "Visualizar no Studio" */}
            <div
              className="absolute inset-0 bg-ink/55 opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <div className="text-center px-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <div className="text-[10px] tracking-[0.32em] uppercase text-gold mb-2">
                  Inspiração
                </div>
                <div className="font-display text-xl md:text-2xl text-bone mb-3 leading-tight">
                  Visualize no Studio
                </div>
                <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-gold-hover">
                  Explorar peça
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>

            {/* Badge EXEMPLO — conteúdo curado de demonstração */}
            <span
              className="absolute top-3 left-3 text-[9px] tracking-[0.22em] uppercase font-semibold px-2 py-1 rounded-sm backdrop-blur-sm border border-white/30 z-10 pointer-events-none"
              style={{
                background: "rgba(212, 175, 55, 0.85)",
                color: "#FFFFFF",
                textShadow: "0 1px 1px rgba(0,0,0,0.25)",
              }}
              data-testid={`mockup-exemplo-badge-${m.id}`}
            >
              Exemplo
            </span>

            <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between group-hover:opacity-0 transition-opacity duration-500">
              <div>
                <div className="text-[10px] tracking-[0.32em] uppercase text-gold mb-1">
                  Premium
                </div>
                <div className="font-display text-2xl">{m.label}</div>
              </div>
              <motion.div
                whileHover={{ rotate: -8, scale: 1.12 }}
                transition={{ type: "spring", stiffness: 360, damping: 14 }}
                className="w-9 h-9 rounded-full glass-strong flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-colors duration-500"
              >
                →
              </motion.div>
            </div>
            <div className="absolute inset-0 border border-transparent group-hover:border-gold/40 transition-colors duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
