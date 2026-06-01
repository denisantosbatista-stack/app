import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MOCKUPS } from "@/data/palettes";

// Mapeamento de "mármore CSS" por id do mockup — substitui as imagens externas
// (que causavam riscos de direitos autorais / carregamento quebrado) por
// gradientes radiais e cônicos representando veios reais de mármore.
//
// Cada paleta:
// - base: cor predominante da pedra
// - vein: cor dos veios metálicos (ouro / prata)
// - accent: tom secundário usado nas manchas
const MARBLE_STYLES = {
  clock: {
    base: "#1A1A1A",
    vein: "#D4AF37",
    accent: "#3A2E1A",
  },
  tray: {
    base: "#F4F1EC",
    vein: "#C0C0C0",
    accent: "#E5DCD0",
  },
  geode: {
    base: "#1B3A6B",
    vein: "#D4AF37",
    accent: "#0E2347",
  },
};

function MarbleSurface({ id }) {
  const { base, vein, accent } =
    MARBLE_STYLES[id] || MARBLE_STYLES.clock;

  // Composição multi-camadas: fundo sólido + manchas + veios diagonais.
  // Usamos `conic-gradient` para simular veios irregulares e radial para profundidade.
  const background = [
    // veios finos diagonais (ouro/prata)
    `linear-gradient(118deg, transparent 0%, transparent 38%, ${vein}55 39%, ${vein}AA 40%, ${vein}55 41%, transparent 42%, transparent 62%, ${vein}33 63%, ${vein}77 64%, transparent 65%, transparent 100%)`,
    // veio largo secundário
    `linear-gradient(72deg, transparent 0%, transparent 55%, ${vein}22 56%, ${vein}55 58%, ${vein}22 60%, transparent 61%, transparent 100%)`,
    // manchas claras/escuras
    `radial-gradient(ellipse 60% 50% at 22% 28%, ${accent}99, transparent 60%)`,
    `radial-gradient(ellipse 70% 55% at 78% 75%, ${accent}77, transparent 65%)`,
    `radial-gradient(ellipse 45% 40% at 50% 90%, ${vein}22, transparent 70%)`,
    // base sólida
    `linear-gradient(135deg, ${base} 0%, ${base} 100%)`,
  ].join(", ");

  return (
    <div
      className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-110"
      style={{ background }}
      aria-hidden="true"
    >
      {/* brilho de polimento sutil */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 30% 20%, rgba(255,255,255,0.45) 0%, transparent 55%)",
        }}
      />
      {/* granulação fina (textura de pedra) */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px), radial-gradient(rgba(0,0,0,0.3) 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px, 5px 5px",
          backgroundPosition: "0 0, 1px 2px",
        }}
      />
    </div>
  );
}

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
            <MarbleSurface id={m.id} />

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
