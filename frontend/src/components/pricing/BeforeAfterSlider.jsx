import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

/**
 * BeforeAfterSlider — drag handle horizontal para revelar "Antes" vs "Depois".
 *
 * Props:
 *  - before, after: ReactNodes renderizados em posição absoluta (preencher container).
 *  - initial: % inicial da revelação (0-100). Padrão 50.
 *  - aspect: classe Tailwind para aspecto, ex.: "aspect-[4/3]". Padrão "aspect-[4/3]".
 *  - labelBefore, labelAfter: textos PT-BR exibidos nos chips dos cantos.
 *  - testid: data-testid raiz.
 */
export default function BeforeAfterSlider({
  before,
  after,
  initial = 50,
  aspect = "aspect-[4/3]",
  labelBefore = "Antes",
  labelAfter = "Depois",
  testid = "before-after-slider",
}) {
  const containerRef = useRef(null);
  const [pct, setPct] = useState(initial);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const next = (x / rect.width) * 100;
    setPct(next);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      updateFromClientX(cx);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  const onDown = (e) => {
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    updateFromClientX(cx);
  };

  const onKey = (e) => {
    if (e.key === "ArrowLeft") setPct((v) => Math.max(0, v - 4));
    if (e.key === "ArrowRight") setPct((v) => Math.min(100, v + 4));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${aspect} overflow-hidden rounded-sm border border-black/10 bg-black/5 select-none cursor-ew-resize`}
      onMouseDown={onDown}
      onTouchStart={onDown}
      data-testid={testid}
    >
      {/* Camada AFTER (fica embaixo, sempre visível) */}
      <div className="absolute inset-0">{after}</div>

      {/* Camada BEFORE (clip-path revelado pela barra) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        aria-hidden="true"
      >
        {before}
      </div>

      {/* Chip canto sup. esq. (Antes) */}
      <span
        className="absolute top-3 left-3 z-10 text-[9px] tracking-[0.22em] uppercase px-2 py-1 rounded-sm bg-black/70 text-white"
        data-testid={`${testid}-label-before`}
      >
        {labelBefore}
      </span>
      {/* Chip canto sup. dir. (Depois) */}
      <span
        className="absolute top-3 right-3 z-10 text-[9px] tracking-[0.22em] uppercase px-2 py-1 rounded-sm bg-gradient-to-r from-gold-hover via-gold to-gold-deep text-white shadow-gold"
        data-testid={`${testid}-label-after`}
      >
        ✦ {labelAfter}
      </span>

      {/* Linha divisora */}
      <div
        className="absolute top-0 bottom-0 z-20 w-[2px] bg-white shadow-[0_0_18px_rgba(0,0,0,0.35)] pointer-events-none"
        style={{ left: `calc(${pct}% - 1px)` }}
      />

      {/* Handle */}
      <button
        type="button"
        onKeyDown={onKey}
        onMouseDown={(e) => {
          e.stopPropagation();
          onDown(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onDown(e);
        }}
        aria-label="Arraste para comparar antes e depois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        role="slider"
        className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-gold-lg border-2 border-gold flex items-center justify-center hover:scale-105 transition-transform cursor-ew-resize"
        style={{ left: `${pct}%` }}
        data-testid={`${testid}-handle`}
      >
        <GripVertical className="w-4 h-4 text-gold-deep" />
      </button>
    </div>
  );
}
