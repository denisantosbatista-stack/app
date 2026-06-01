import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import PieceShape from "@/components/PieceShape";
import NotifyMeModal from "@/components/NotifyMeModal";
import { PIECES, STYLES } from "@/data/palettes";

export function StyleSelector({ activeStyleId, onChange, activeStyle }) {
  const [tab, setTab] = useState("classico"); // classico | luxo

  const classicStyles = STYLES.filter((s) => s.category !== "luxo");
  const luxoStyles = STYLES.filter((s) => s.category === "luxo");
  const list = tab === "luxo" ? luxoStyles : classicStyles;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-display text-xl tracking-tight">Estilo</h3>
        <span className="text-xs text-zinc-500 italic truncate max-w-[60%]">
          {activeStyle?.description}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-ink-surface rounded-sm w-fit border border-black/[0.06]">
        <button
          onClick={() => setTab("classico")}
          className={`text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all ${
            tab === "classico" ? "bg-white shadow-sm text-ink-text" : "text-zinc-500 hover:text-ink-text"
          }`}
          data-testid="style-tab-classico"
        >
          Clássicos
        </button>
        <button
          onClick={() => setTab("luxo")}
          className={`text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all inline-flex items-center gap-1 ${
            tab === "luxo" ? "bg-white shadow-sm text-gold-deep" : "text-zinc-500 hover:text-gold-deep"
          }`}
          data-testid="style-tab-luxo"
        >
          <Crown className="w-3 h-3" />
          Luxo
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
        {list.map((s) => {
          const active = activeStyleId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`relative text-[11px] px-3 py-2 rounded-sm uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                active
                  ? "bg-gold text-ink shadow-gold"
                  : "border border-black/10 text-zinc-700 hover:border-gold/40"
              }`}
              data-testid={`style-${s.id}`}
            >
              {s.premium && (
                <Crown className={`w-2.5 h-2.5 inline-block mr-1 -mt-0.5 ${active ? "text-ink" : "text-gold-deep"}`} />
              )}
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PieceSelector({ activePieceId, onChange, palette }) {
  // Galeria 3D limitada a 3 peças exemplares enquanto novas produções não estão
  // disponíveis. As demais peças do catálogo permanecem cadastradas em PIECES e
  // serão reativadas conforme novos modelos 3D forem aprovados.
  const VISIBLE_PIECE_IDS = ["pingente-gota", "bandeja", "geodo"];
  const visiblePieces = useMemo(
    () => VISIBLE_PIECE_IDS
      .map((id) => PIECES.find((p) => p.id === id))
      .filter(Boolean),
    []
  );
  const [notifyOpen, setNotifyOpen] = useState(false);

  return (
    <div data-testid="piece-selector-limited">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-display text-xl tracking-tight">Tipo de peça</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {visiblePieces.map((p) => {
          const active = activePieceId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-sm transition-all ${
                active
                  ? "bg-ink-elevated ring-1 ring-gold shadow-gold"
                  : "bg-ink-surface ring-1 ring-black/[0.06] hover:ring-black/20"
              }`}
              data-testid={`piece-${p.id}`}
            >
              <div className="w-14 h-14">
                <PieceShape piece={p} palette={palette} size={56} animated={false} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-700 text-center leading-tight">
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setNotifyOpen(true)}
        className="block mx-auto mt-4 group cursor-pointer"
        data-testid="piece-coming-soon"
        aria-label="Quero ser avisado quando chegarem novas peças"
      >
        <span className="text-xs text-[#D4AF37] italic tracking-wide border-b border-dashed border-[#D4AF37]/40 group-hover:border-[#D4AF37] group-hover:text-gold-deep transition-colors">
          Mais produções em breve · me avise
        </span>
      </button>

      <NotifyMeModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  );
}
