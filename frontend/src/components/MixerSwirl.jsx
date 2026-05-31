import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Play, Sparkles, Video } from "lucide-react";
import toast from "react-hot-toast";
import { chamarIA, ApiError } from "@/utils/api";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

/**
 * Simulação realista de mistura de tintas:
 *  - Canvas 2D: swirl orgânico em tempo real entre Cor A e Cor B (loop).
 *  - Botão "Gerar vídeo IA" → POST /api/ai/generate-video → <video> mp4 base64.
 */
export default function MixerSwirl({ colorA, colorB }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const [duration, setDuration] = useState(4);

  // === Canvas 2D swirl animation ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    startRef.current = performance.now();

    const draw = (now) => {
      const t = (now - startRef.current) / 1000;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Fundo de estúdio
      const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h));
      bg.addColorStop(0, "#1a1a1f");
      bg.addColorStop(1, "#08080b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 2 blobs principais que giram e se interpenetram
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.32;

      const ang = t * 0.6;
      const ax = cx + Math.cos(ang) * r * 0.55;
      const ay = cy + Math.sin(ang) * r * 0.55;
      const bx = cx + Math.cos(ang + Math.PI) * r * 0.55;
      const by = cy + Math.sin(ang + Math.PI) * r * 0.55;

      ctx.globalCompositeOperation = "lighter";

      const gA = ctx.createRadialGradient(ax, ay, 4, ax, ay, r);
      gA.addColorStop(0, colorA + "ff");
      gA.addColorStop(0.6, colorA + "aa");
      gA.addColorStop(1, colorA + "00");
      ctx.fillStyle = gA;
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, Math.PI * 2);
      ctx.fill();

      const gB = ctx.createRadialGradient(bx, by, 4, bx, by, r);
      gB.addColorStop(0, colorB + "ff");
      gB.addColorStop(0.6, colorB + "aa");
      gB.addColorStop(1, colorB + "00");
      ctx.fillStyle = gB;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Veios dourados (mica)
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 18; i++) {
        const a = t * 0.8 + i * 0.6;
        const x = cx + Math.cos(a) * (r * 0.85 + Math.sin(t + i) * 12);
        const y = cy + Math.sin(a * 1.4) * (r * 0.7 + Math.cos(t + i) * 12);
        const radius = 0.6 + (Math.sin(t * 2 + i) + 1) * 0.9;
        const sparkle = ctx.createRadialGradient(x, y, 0, x, y, radius * 6);
        sparkle.addColorStop(0, "rgba(255,210,120,0.9)");
        sparkle.addColorStop(1, "rgba(212,175,55,0)");
        ctx.fillStyle = sparkle;
        ctx.beginPath();
        ctx.arc(x, y, radius * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Brilho central glossy
      ctx.globalCompositeOperation = "overlay";
      const gloss = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy * 0.85, r * 1.1);
      gloss.addColorStop(0, "rgba(255,255,255,0.25)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.arc(cx, cy * 0.85, r * 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [colorA, colorB]);

  const pollRef = useRef(null);

  // Limpa polling no unmount
  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const pollJob = async (jobId, tid, attempt = 0) => {
    try {
      const res = await fetch(`${API_BASE}/api/ai/video-status/${jobId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === "completed" && data.video_base64) {
        const src = `data:${data.mime_type || "video/mp4"};base64,${data.video_base64}`;
        setVideoSrc(src);
        setLoadingVideo(false);
        toast.success("Vídeo realista pronto!", { id: tid });
        return;
      }
      if (data.status === "error") {
        setLoadingVideo(false);
        toast.error(`Falha IA: ${data.detail || "erro"}`, { id: tid });
        return;
      }
      // ainda processando — agenda próximo poll (até ~5 min = 60 tentativas a cada 5s)
      if (attempt >= 90) {
        setLoadingVideo(false);
        toast.error("Tempo esgotado aguardando IA", { id: tid });
        return;
      }
      pollRef.current = setTimeout(() => pollJob(jobId, tid, attempt + 1), 5000);
    } catch (e) {
      setLoadingVideo(false);
      toast.error(`Erro de polling: ${e.message || "erro"}`, { id: tid });
    }
  };

  const handleGenerateVideo = async () => {
    if (loadingVideo) return;
    setLoadingVideo(true);
    setVideoSrc(null);
    const tid = toast.loading("IA gerando vídeo realista… pode levar ~1min", {
      icon: "🎬",
    });
    try {
      const data = await chamarIA("/ai/generate-video", {
        color_a: colorA,
        color_b: colorB,
        duration,
        size: "1280x720",
      });
      if (!data.job_id) throw new Error("job_id ausente na resposta");
      // inicia polling em 3s para dar tempo ao background task arrancar
      pollRef.current = setTimeout(() => pollJob(data.job_id, tid, 0), 3000);
    } catch (e) {
      setLoadingVideo(false);
      let msg;
      if (e instanceof ApiError && e.tipo === "saldo") {
        msg = "Saldo do Universal Key esgotado. Recarregue para gerar vídeos.";
      } else if (e instanceof ApiError && e.tipo === "config") {
        // 503 — FAL_KEY ausente. Usa detail PT-BR vindo do backend quando disponível.
        msg =
          typeof e.detail === "string"
            ? e.detail
            : "FAL_KEY ausente no backend. Configure em backend/.env (fal.ai/dashboard/keys).";
      } else if (e?.status === 503 || /FAL_KEY/i.test(`${e?.detail || ""} ${e?.message || ""}`)) {
        msg = "FAL_KEY ausente no backend. Configure em backend/.env (fal.ai/dashboard/keys).";
      } else {
        msg = `Falha IA: ${e?.message || "erro"}`;
      }
      toast.error(msg, { id: tid, duration: 6000 });
    }
  };

  return (
    <div className="glass-strong rounded-sm p-6 relative overflow-hidden" data-testid="mixer-swirl-card">
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="label-eyebrow text-gold inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Simulação realista
            </div>
            <h3 className="font-display text-2xl tracking-tight mt-1">
              Swirl 2D + <span className="italic gold-shimmer">IA</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Duração
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={loadingVideo}
              className="text-xs font-mono px-2 py-1.5 rounded-sm border border-black/15 bg-white/70"
              data-testid="mixer-video-duration"
            >
              <option value={4}>4s</option>
              <option value={8}>8s</option>
              <option value={12}>12s</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="aspect-video rounded-sm overflow-hidden border border-black/10 bg-black">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              data-testid="mixer-swirl-canvas"
            />
          </div>

          <div className="aspect-video rounded-sm overflow-hidden border border-black/10 bg-black/90 relative flex items-center justify-center">
            {videoSrc ? (
              <motion.video
                key={videoSrc}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                src={videoSrc}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
                data-testid="mixer-sora-video"
              />
            ) : (
              <div className="text-center px-4">
                {loadingVideo ? (
                  <div className="flex flex-col items-center gap-3 text-zinc-300">
                    <Loader2 className="w-7 h-7 animate-spin text-gold" />
                    <div className="text-[11px] tracking-[0.2em] uppercase">
                      Gerando com IA…
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Aguarde, pode levar até 1 minuto.
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <Play className="w-7 h-7 text-gold" />
                    <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-300">
                      Aguardando geração
                    </div>
                    <div className="text-[10px] text-zinc-500 max-w-[28ch]">
                      Clique no botão para gerar um vídeo realista da mistura via IA.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={loadingVideo}
          className="btn-gold mt-5 w-full px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="mixer-generate-video-btn"
        >
          {loadingVideo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
          {loadingVideo ? "Gerando vídeo…" : "Gerar vídeo realista (IA)"}
        </button>

        <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
          A simulação 2D roda instantaneamente no canvas. O vídeo cinematográfico
          é gerado por Stable Video Diffusion 2.0 a partir das suas cores ({colorA.toUpperCase()} ×{" "}
          {colorB.toUpperCase()}).
        </p>
      </div>
    </div>
  );
}
