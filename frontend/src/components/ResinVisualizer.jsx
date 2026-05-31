import { useEffect, useRef } from "react";

// --- helpers de cor ------------------------------------------------------

function hexToRgb(hex) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to = (v) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexWithA(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// luminância relativa (sRGB)
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

// Escurece um hex (mistura com preto). amount 0..1
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: Math.round(r * (1 - amount)),
    g: Math.round(g * (1 - amount)),
    b: Math.round(b * (1 - amount)),
  });
}

// --- Visualizer -----------------------------------------------------------
//
// Render resina líquida em canvas 2D que se adapta à paleta recebida.
// IMPORTANTE: não usar `globalCompositeOperation = "screen"` com paletas
// claras — somam para branco. Usamos `source-over` com alpha, ordenando
// blobs do mais escuro (base) ao mais claro (highlight), e derivando o
// fundo da própria paleta (escurecendo a cor mais escura). Isso garante
// que "Geodo Imperial" (cream/gold/ivory/bronze) fique dourado-escuro e
// "Oceano Mineral" fique azul profundo, em vez de virar borrão branco.

export default function ResinVisualizer({
  palette,
  animated = true,
  size = 480,
  intensity = 1,
  className = "",
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const blobsRef = useRef([]);
  const dpr =
    typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const colors = (palette?.colors || []).slice();
    if (colors.length === 0) return;

    // Cor mais escura e mais clara da paleta — usadas como fundo e highlight.
    const sorted = [...colors].sort(
      (a, b) => luminance(a.hex) - luminance(b.hex),
    );
    const darkest = sorted[0].hex;
    const lightest = sorted[sorted.length - 1].hex;

    // Fundo: cor mais escura escurecida ainda mais (mantém matiz da paleta).
    const bgDeep = darken(darkest, 0.55);
    const bgMid = darken(darkest, 0.25);

    // Veios dourados: usa a role "veios" se existir; senão tenta achar uma
    // cor quente; senão usa dourado padrão.
    const veinFromRole = colors.find((c) => c.role === "veios")?.hex;
    const veinColor = veinFromRole || "#D4AF37";

    // Cria blobs com tamanhos e posições determinísticas-ish.
    // Blobs grandes para cores escuras (base), médios para principais,
    // pequenos para detalhes claros (highlight).
    blobsRef.current = colors.map((c, i) => {
      const lum = luminance(c.hex);
      // tamanho inverso à luminância: cor mais escura = blob maior
      const sizeFactor = 0.22 + (1 - lum) * 0.22;
      // alpha maior para cores escuras (base sólida) e menor para claras
      const baseAlpha = 0.78 - lum * 0.25;
      return {
        hex: c.hex,
        role: c.role,
        lum,
        baseAlpha,
        r: w * sizeFactor,
        cx: w * (0.28 + ((i * 0.21) % 0.5)),
        cy: h * (0.28 + ((i * 0.37) % 0.5)),
        vx: (Math.sin(i * 1.7) * 0.5),
        vy: (Math.cos(i * 2.3) * 0.5),
        phase: i * 1.1,
        idx: i,
      };
    });

    // Ordena: blobs mais escuros desenhados primeiro (base), mais claros
    // por cima (highlight). source-over + alpha = mistura natural.
    blobsRef.current.sort((a, b) => a.lum - b.lum);

    const draw = () => {
      timeRef.current += 0.008 * intensity;
      const t = timeRef.current;

      // ---- background derivado da paleta -----------------------------
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bgDeep;
      ctx.fillRect(0, 0, w, h);

      // vignette suave usando cor mid da paleta
      const vg = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        w * 0.08,
        w * 0.5,
        h * 0.5,
        w * 0.75,
      );
      vg.addColorStop(0, hexWithA(bgMid, 0.55));
      vg.addColorStop(1, hexWithA(bgDeep, 0.95));
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // ---- blobs (base + acentos) ------------------------------------
      ctx.globalCompositeOperation = "source-over";
      blobsRef.current.forEach((b) => {
        if (animated) {
          b.cx += b.vx;
          b.cy += b.vy;
          if (b.cx < b.r * 0.4 || b.cx > w - b.r * 0.4) b.vx *= -1;
          if (b.cy < b.r * 0.4 || b.cy > h - b.r * 0.4) b.vy *= -1;
        }
        const rad = b.r + Math.sin(t * 1.3 + b.phase) * (b.r * 0.16);
        const grad = ctx.createRadialGradient(
          b.cx,
          b.cy,
          rad * 0.05,
          b.cx,
          b.cy,
          rad,
        );
        grad.addColorStop(0, hexWithA(b.hex, b.baseAlpha));
        grad.addColorStop(0.6, hexWithA(b.hex, b.baseAlpha * 0.55));
        grad.addColorStop(1, hexWithA(b.hex, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---- veios dourados (overlay leve) -----------------------------
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = hexWithA(veinColor, 0.42);
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = (h * (i + 1)) / 4;
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 16) {
          const y =
            yBase +
            Math.sin(x * 0.02 + t * 1.2 + i) * 22 +
            Math.cos(x * 0.04 - t + i * 2) * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ---- shimmer dourado (partículas finas) ------------------------
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i++) {
        const px = (Math.sin(t * 0.7 + i * 1.3) * 0.4 + 0.5) * w;
        const py = (Math.cos(t * 0.5 + i * 2.1) * 0.4 + 0.5) * h;
        const sz = 1.2 + Math.sin(t * 2 + i) * 0.9;
        ctx.fillStyle = hexWithA(veinColor, 0.55);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- highlight superior (gloss) --------------------------------
      ctx.globalCompositeOperation = "source-over";
      const hl = ctx.createRadialGradient(
        w * 0.32,
        h * 0.22,
        0,
        w * 0.32,
        h * 0.22,
        w * 0.55,
      );
      hl.addColorStop(0, hexWithA(lightest, 0.18));
      hl.addColorStop(1, hexWithA(lightest, 0));
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, w, h);

      if (animated) rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, animated, size, intensity, dpr]);

  return (
    <canvas
      ref={canvasRef}
      className={`liquid-canvas rounded-sm ${className}`}
      data-testid="resin-visualizer"
    />
  );
}
