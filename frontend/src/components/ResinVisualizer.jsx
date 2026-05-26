import { useEffect, useRef } from "react";

// Liquid resin visualizer using metaballs + flowing gradient (canvas 2D)
export default function ResinVisualizer({ palette, animated = true, size = 480, intensity = 1, className = "" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const blobsRef = useRef([]);
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

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

    // init blobs based on palette
    const colors = palette.colors;
    blobsRef.current = colors.map((c, i) => ({
      hex: c.hex,
      r: w * (0.18 + Math.random() * 0.18),
      cx: w * (0.25 + Math.random() * 0.5),
      cy: h * (0.25 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      phase: Math.random() * Math.PI * 2,
      idx: i,
    }));

    const draw = () => {
      timeRef.current += 0.008 * intensity;
      const t = timeRef.current;

      // base background
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, w, h);

      // soft vignette dark
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, "rgba(20,20,20,0.4)");
      vg.addColorStop(1, "rgba(0,0,0,0.95)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // blend mode for fluid mixing
      ctx.globalCompositeOperation = "screen";
      blobsRef.current.forEach((b, i) => {
        if (animated) {
          b.cx += b.vx;
          b.cy += b.vy;
          // bounce within bounds
          if (b.cx < b.r * 0.5 || b.cx > w - b.r * 0.5) b.vx *= -1;
          if (b.cy < b.r * 0.5 || b.cy > h - b.r * 0.5) b.vy *= -1;
        }
        const rad = b.r + Math.sin(t * 1.4 + b.phase) * (b.r * 0.18);
        const grad = ctx.createRadialGradient(b.cx, b.cy, rad * 0.05, b.cx, b.cy, rad);
        grad.addColorStop(0, hexWithA(b.hex, 0.95));
        grad.addColorStop(0.5, hexWithA(b.hex, 0.55));
        grad.addColorStop(1, hexWithA(b.hex, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // golden veins
      ctx.globalCompositeOperation = "screen";
      const veinColor = colors.find((c) => c.role === "veios")?.hex || "#D4AF37";
      ctx.strokeStyle = hexWithA(veinColor, 0.35);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = (h * (i + 1)) / 4;
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 16) {
          const y = yBase + Math.sin((x * 0.02) + t * 1.2 + i) * 22 + Math.cos((x * 0.04) - t + i * 2) * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // shimmer particles
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i++) {
        const px = (Math.sin(t * 0.7 + i * 1.3) * 0.4 + 0.5) * w;
        const py = (Math.cos(t * 0.5 + i * 2.1) * 0.4 + 0.5) * h;
        const sz = 1.4 + Math.sin(t * 2 + i) * 1;
        ctx.fillStyle = hexWithA("#FFE7A3", 0.6);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // soft inner highlight (top-left)
      const hl = ctx.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, w * 0.5);
      hl.addColorStop(0, "rgba(255,255,255,0.08)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, w, h);

      if (animated) rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // All other deps are derived from `palette` and locals inside the effect.
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

function hexWithA(hex, a) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  const r = parseInt(m[0], 16),
    g = parseInt(m[1], 16),
    b = parseInt(m[2], 16);
  return `rgba(${r},${g},${b},${a})`;
}
