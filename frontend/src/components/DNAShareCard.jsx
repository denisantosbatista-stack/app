import { forwardRef } from "react";
import { Fingerprint } from "lucide-react";

/**
 * Cartão visual quadrado (1080x1080 lógico) pronto para export PNG via html2canvas
 * ou para renderização na página pública /dna/:id.
 *
 * Props:
 *  - dna: payload retornado por /api/ai/visual-dna
 *  - handle?: string opcional para badge "@handle"
 *  - compact?: boolean → versão menor para preview embutido (escala via CSS)
 */
const DNAShareCard = forwardRef(function DNAShareCard(
  { dna, handle, compact = false },
  ref
) {
  if (!dna) return null;
  const dominant = (dna.dominant || []).slice(0, 6);
  const mood = (dna.mood || []).slice(0, 5);
  const next = (dna.next_palette || []).slice(0, 5);
  const palettes = dna.stats?.palettes || 0;
  const luxury = dna.avg?.luxury || 0;

  return (
    <div
      ref={ref}
      data-testid="dna-share-card"
      className="relative overflow-hidden"
      style={{
        width: 1080,
        height: 1080,
        background:
          "radial-gradient(circle at 20% 10%, #1a1a1a 0%, #0d0d0d 60%, #050505 100%)",
        color: "#f5f0e1",
        fontFamily: '"Cormorant Garamond", "Playfair Display", serif',
        transform: compact ? "scale(0.5)" : "none",
        transformOrigin: "top left",
      }}
    >
      {/* grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(212,175,55,0.06) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* gold corner accents */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 56,
          width: 90,
          height: 1,
          background: "#d4af37",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 56,
          right: 56,
          width: 90,
          height: 1,
          background: "#d4af37",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 56,
          width: 90,
          height: 1,
          background: "#d4af37",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 56,
          right: 56,
          width: 90,
          height: 1,
          background: "#d4af37",
        }}
      />

      {/* HEADER */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 12,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#d4af37",
              marginBottom: 16,
            }}
          >
            LindArt · Assinatura de Cor
          </div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#f5f0e1",
            }}
          >
            Sua linguagem
            <br />
            cromática
          </div>
        </div>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 2,
            border: "1px solid rgba(212,175,55,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(212,175,55,0.06)",
          }}
        >
          <Fingerprint size={42} color="#d4af37" />
        </div>
      </div>

      {/* SIGNATURE BLOCK */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 80,
          right: 80,
        }}
      >
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(245,240,225,0.5)",
            marginBottom: 18,
          }}
        >
          Assinatura
        </div>
        <div
          style={{
            fontSize: 38,
            lineHeight: 1.25,
            color: "#f5f0e1",
            fontStyle: "italic",
            maxHeight: 200,
            overflow: "hidden",
          }}
        >
          {dna.signature || "—"}
        </div>
      </div>

      {/* MOOD CHIPS */}
      {mood.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 590,
            left: 80,
            right: 80,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {mood.map((m, i) => (
            <span
              key={i}
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 14,
                letterSpacing: "0.06em",
                textTransform: "lowercase",
                padding: "8px 16px",
                border: "1px solid rgba(212,175,55,0.35)",
                borderRadius: 2,
                color: "#f5f0e1",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* DOMINANT COLORS STRIP */}
      {dominant.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 700,
            left: 80,
            right: 80,
          }}
        >
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(245,240,225,0.5)",
              marginBottom: 14,
            }}
          >
            Cores dominantes
          </div>
          <div style={{ display: "flex", gap: 0, height: 90 }}>
            {dominant.map((c, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: c.hex,
                  borderRight:
                    i < dominant.length - 1
                      ? "1px solid rgba(0,0,0,0.15)"
                      : "none",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 8,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: "rgba(245,240,225,0.55)",
            }}
          >
            {dominant.map((c, i) => (
              <div
                key={i}
                style={{ flex: 1, textAlign: "center" }}
              >
                {c.hex}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEXT PALETTE */}
      {next.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 840,
            left: 80,
            right: 80,
          }}
        >
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#d4af37",
              marginBottom: 14,
            }}
          >
            Próxima paleta sugerida
          </div>
          <div style={{ display: "flex", gap: 6, height: 60 }}>
            {next.map((hex, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: hex,
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontFamily: '"Inter", sans-serif',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(245,240,225,0.5)",
              marginBottom: 6,
            }}
          >
            {handle ? `@${handle}` : "Artista"}
          </div>
          <div style={{ fontSize: 14, color: "rgba(245,240,225,0.7)" }}>
            {palettes} {palettes === 1 ? "paleta" : "paletas"} · luxo {luxury}
            /100
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 13,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#d4af37",
          }}
        >
          lindart.studio
        </div>
      </div>
    </div>
  );
});

export default DNAShareCard;
