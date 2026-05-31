import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Crown,
  Sparkles,
  ChevronsLeftRight,
  BadgeCheck,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PLANS } from "../../data/pricingPlans";

/**
 * Slider Antes/Depois Pro — comparativo visual entre o plano Livre e Pro.
 * - Cortina arrastável horizontal (Framer Motion drag).
 * - Conteúdo: features textuais (de pricingPlans.js) + mini-preview de paleta.
 * - Acessibilidade: aria-valuenow + setas do teclado para controlar a divisória.
 *
 * Posicionamento: abaixo dos cards de plano, antes da tabela comparativa.
 */

/* ──────────────────────────────────────────────────────────
   Dados utilizados — fonte única em pricingPlans.js
   ────────────────────────────────────────────────────────── */
const FREE = PLANS.find((p) => p.id === "livre");
const PRO = PLANS.find((p) => p.id === "pro");

/* Highlights derivados que NÃO estão no Free (para ✗ vs ✓) */
const PRO_HIGHLIGHTS = PRO.perks;
const FREE_LIMITATIONS = [
  "5 paletas / mês",
  "Sem Mentoria IA",
  "Sem vídeo IA",
  "Sem perfil verificado",
  "Sem versionamento Pro",
];

/* Mini-preview de paleta — duas variantes (Free vs Pro) */
const FREE_SWATCHES = ["#C9C4BC", "#A89F92", "#7E7568", "#564F46", "#2E2A24"];
const PRO_SWATCHES = [
  "#F4D8A8",
  "#E8B66B",
  "#D4A33C",
  "#B0782A",
  "#7A4B1E",
  "#3F2613",
  "#1A0E08",
  "#E3C28C",
];

/* ──────────────────────────────────────────────────────────
   Componente
   ────────────────────────────────────────────────────────── */
export default function PricingBeforeAfter() {
  const wrapRef = useRef(null);
  const [handle, setHandle] = useState(50); // 0..100 (% da posição da divisória)
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);

  /* Atualiza largura do container para o drag funcionar em qualquer viewport */
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  /* Movimento em pointer (mouse + touch via pointer events) */
  const setHandleFromClientX = useCallback(
    (clientX) => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setHandle(pct);
    },
    []
  );

  const onPointerDown = (e) => {
    setDragging(true);
    setHandleFromClientX(e.clientX);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    setHandleFromClientX(e.clientX);
  };
  const onPointerUp = (e) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHandle((h) => Math.max(0, h - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setHandle((h) => Math.min(100, h + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHandle(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHandle(100);
    }
  };

  return (
    <section
      className="relative px-6 md:px-10 pb-16 md:pb-24"
      data-testid="pricing-before-after"
      aria-labelledby="before-after-title"
    >
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-left md:text-center mb-8 md:mb-10">
          <div className="label-eyebrow mb-4 flex md:justify-center items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,178,96,0.7)]" />
            Antes & Depois Pro
          </div>
          <h2
            id="before-after-title"
            className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          >
            Arraste e veja a diferença <br className="hidden md:block" />
            do <span className="gold-shimmer">plano Pro</span> no seu ateliê.
          </h2>
          <p className="mt-4 text-sm md:text-base text-ink-muted max-w-2xl md:mx-auto">
            À esquerda: o que você tem no Livre. À direita: o que destrava com o
            Pro. Mova a divisória para comparar.
          </p>
        </div>

        {/* Slider Antes/Depois */}
        <div
          className="relative rounded-2xl overflow-hidden border border-black/10 shadow-deep bg-white select-none min-h-[460px] md:min-h-[520px]"
          ref={wrapRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="pricing-before-after-slider"
        >
          {/* Camada de baixo — DEPOIS (Pro) */}
          <SidePanel side="after" />

          {/* Camada de cima — ANTES (Livre), recortada conforme handle% */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 ${100 - handle}% 0 0)`,
              WebkitClipPath: `inset(0 ${100 - handle}% 0 0)`,
              transition: dragging ? "none" : "clip-path 0.18s ease-out",
            }}
            aria-hidden={handle < 5}
          >
            <SidePanel side="before" />
          </div>

          {/* Linha + handle */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${handle}%`, transform: "translateX(-1px)" }}
          >
            <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-gold/40 via-gold to-gold/40 shadow-[0_0_18px_rgba(212,175,55,0.55)]" />
          </div>
          <button
            type="button"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(handle)}
            aria-label="Divisória entre plano Livre e plano Pro"
            onKeyDown={onKeyDown}
            data-testid="pricing-before-after-handle"
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-gold-lg border-2 border-gold inline-flex items-center justify-center cursor-ew-resize z-10 hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-gold/40"
            style={{ left: `${handle}%` }}
          >
            <ChevronsLeftRight className="w-5 h-5 text-gold-deep" />
          </button>

          {/* Labels canto */}
          <div className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] tracking-[0.22em] uppercase backdrop-blur-md">
            <Sparkles className="w-3 h-3" />
            Livre
          </div>
          <div className="pointer-events-none absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold-hover via-gold to-gold-deep text-white text-[10px] tracking-[0.22em] uppercase shadow-gold">
            <Crown className="w-3 h-3" />
            Pro
          </div>
        </div>

        {/* CTA + dica */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-muted text-center sm:text-left">
            Dica: arraste a divisória dourada ou use as
            <kbd className="mx-1 px-1.5 py-0.5 rounded border border-black/10 bg-white/70 text-[10px] font-mono">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-black/10 bg-white/70 text-[10px] font-mono">
              →
            </kbd>
            do teclado.
          </p>
          <Link
            to={PRO.ctaTo}
            data-testid="pricing-before-after-cta"
            className="btn-gold inline-flex items-center justify-center px-6 py-3 rounded-sm text-xs tracking-[0.22em] uppercase"
          >
            ✦ Assinar Pro · R$ {PRO.monthly}/mês
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   Painel "Antes" (Livre) ou "Depois" (Pro)
   ────────────────────────────────────────────────────────── */
function SidePanel({ side }) {
  const isAfter = side === "after";
  return (
    <div
      className={`absolute inset-0 ${
        isAfter
          ? "bg-gradient-to-br from-[#1B1410] via-[#2A1F18] to-[#0F0A07] text-white"
          : "bg-gradient-to-br from-[#F4F1EC] via-[#E8E2D7] to-[#D9D1C2] text-zinc-800"
      }`}
      data-testid={`pricing-before-after-${side}`}
    >
      {/* Decorativo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: isAfter
            ? "radial-gradient(ellipse at 75% 30%, rgba(212,175,55,0.25), transparent 55%), radial-gradient(ellipse at 20% 85%, rgba(184,149,74,0.18), transparent 55%)"
            : "radial-gradient(ellipse at 30% 20%, rgba(0,0,0,0.05), transparent 55%)",
        }}
      />

      <div className="relative h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-10">
        {/* Lado esquerdo: features textuais */}
        <div className="flex flex-col justify-center">
          <div
            className={`label-eyebrow mb-3 ${
              isAfter ? "text-gold" : "text-zinc-500"
            }`}
          >
            {isAfter ? "✦ Com o Pro" : "Plano Livre"}
          </div>
          <h3
            className={`font-display text-2xl md:text-3xl leading-tight mb-5 ${
              isAfter ? "text-white" : "text-ink-text"
            }`}
          >
            {isAfter
              ? "Sem limites, com IA e prioridade."
              : "Básico, mas com limite."}
          </h3>

          {isAfter ? (
            <ul className="space-y-2.5">
              {PRO_HIGHLIGHTS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2.5 text-sm md:text-[15px] text-white/90"
                >
                  <Check
                    className="w-4 h-4 mt-0.5 shrink-0 text-gold"
                    strokeWidth={2.5}
                  />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2.5">
              {FREE_LIMITATIONS.map((lim) => (
                <li
                  key={lim}
                  className="flex items-start gap-2.5 text-sm md:text-[15px] text-zinc-700"
                >
                  <X
                    className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400"
                    strokeWidth={2.5}
                  />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lado direito: mini-preview visual de paleta */}
        <div className="flex items-center justify-center">
          {isAfter ? <ProPalettePreview /> : <FreePalettePreview />}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Mini-previews de paleta
   ────────────────────────────────────────────────────────── */
function FreePalettePreview() {
  return (
    <div
      className="w-full max-w-sm rounded-xl bg-white/85 backdrop-blur-sm border border-black/10 shadow-soft p-5"
      data-testid="pricing-before-after-free-preview"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
            Paleta · Livre
          </div>
          <div className="font-display text-lg text-ink-text leading-tight">
            Terra Sóbria
          </div>
        </div>
        <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-400">
          3/5 do mês
        </span>
      </div>
      <div className="flex h-20 rounded-md overflow-hidden border border-black/5">
        {FREE_SWATCHES.map((c, i) => (
          <div
            key={`${c}-${i}`}
            className="flex-1"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] tracking-[0.18em] uppercase">
          5 cores
        </div>
        <div className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 text-[10px] tracking-[0.18em] uppercase">
          sem IA
        </div>
      </div>
    </div>
  );
}

function ProPalettePreview() {
  return (
    <motion.div
      initial={{ opacity: 0.85, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full max-w-sm rounded-xl bg-white/95 backdrop-blur-md border-2 border-gold shadow-gold-lg p-5"
      data-testid="pricing-before-after-pro-preview"
    >
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-gold-hover via-gold to-gold-deep text-white text-[9px] tracking-[0.22em] uppercase shadow-gold">
          ✦ Pro
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] tracking-[0.22em] uppercase text-gold-deep">
              Paleta · Pro
            </div>
            <BadgeCheck className="w-3.5 h-3.5 text-gold" />
          </div>
          <div className="font-display text-lg text-ink-text leading-tight">
            Âmbar Verificado
          </div>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-gold-deep text-[10px] tracking-[0.18em] uppercase"
        >
          <History className="w-3 h-3" />
          v3
        </button>
      </div>

      <div className="flex h-20 rounded-md overflow-hidden border border-gold/30 shadow-inner">
        {PRO_SWATCHES.map((c, i) => (
          <div
            key={`${c}-${i}`}
            className="flex-1"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <div className="px-2 py-0.5 rounded-full bg-gold/10 text-gold-deep text-[10px] tracking-[0.18em] uppercase">
          {PRO_SWATCHES.length} cores
        </div>
        <div className="px-2 py-0.5 rounded-full bg-gold/10 text-gold-deep text-[10px] tracking-[0.18em] uppercase">
          IA ilimitada
        </div>
        <div className="px-2 py-0.5 rounded-full bg-gold/10 text-gold-deep text-[10px] tracking-[0.18em] uppercase">
          Vídeo IA
        </div>
      </div>
    </motion.div>
  );
}
