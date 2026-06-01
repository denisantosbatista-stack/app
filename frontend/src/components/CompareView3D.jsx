import React, { Component, Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { motion } from "framer-motion";
import { Box as BoxIcon, MousePointerClick } from "lucide-react";
import { Piece } from "./Resin3DScene";

const h = React.createElement;

// Mesmos formatos disponíveis em Productions3D
const SHAPES = [
  { id: "geodo", label: "Geodo" },
  { id: "bandeja", label: "Bandeja" },
  { id: "colar", label: "Colar" },
];

function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Error boundary local — contém qualquer crash do r3f sem derrubar a página de Compare
class ThreeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function PaletteSwatches({ palette }) {
  return (
    <div className="flex gap-1.5">
      {(palette?.colors || []).slice(0, 4).map((c) => (
        <span
          key={c.hex}
          className="w-3 h-3 rounded-full border border-white/20"
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}

function Fallback({ palette, message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
      <PaletteSwatches palette={palette} />
      <BoxIcon className="w-5 h-5 text-gold-hover/70" />
      <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-400">
        {message || "Preparando cena 3D…"}
      </div>
    </div>
  );
}

function PreviewCanvas({ palette, shape, label, testid }) {
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(null);

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  return (
    <div
      className="aspect-square rounded-sm overflow-hidden border border-black/10 relative"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, #1a1a1f 0%, #0a0a0c 60%, #050507 100%)",
      }}
      data-testid={testid}
    >
      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-sm bg-black/50 backdrop-blur-sm text-[10px] tracking-[0.22em] uppercase text-gold">
        Paleta {label}
      </div>

      {(!mounted || webgl === false) && (
        <Fallback
          palette={palette}
          message={webgl === false ? "3D indisponível" : "Inicializando…"}
        />
      )}

      {webgl && (
        <ThreeBoundary fallback={<Fallback palette={palette} message="3D indisponível" />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.6, 3.4], fov: 38 }}
            onCreated={() => setMounted(true)}
            style={{ width: "100%", height: "100%" }}
            gl={{ toneMappingExposure: 0.95 }}
            frameloop="demand"
          >
            {/*
              TODOS os filhos do Canvas são criados via React.createElement (h)
              em vez de JSX. Motivo: o plugin visual-edits do Emergent injeta
              atributos x-line-number / x-file-name em qualquer elemento JSX.
              Tanto intrínsecos do R3F (color, ambientLight, etc.) quanto
              wrappers do drei (Environment, OrbitControls, ContactShadows)
              repassam essas props para o reconciler R3F via <primitive>, o
              que dispara erros em applyProps ("Cannot set x-line-number").
              Usar createElement diretamente impede o plugin de tocar nestes
              nós, mantendo a cena renderizando limpa.
            */}
            {h("color", { attach: "background", args: ["#0a0a0c"] })}
            {h("ambientLight", { intensity: 0.35 })}
            {h("hemisphereLight", { args: ["#ffffff", "#1a1a1f", 0.25] })}
            {h("directionalLight", { position: [2, 3, 2], intensity: 0.9 })}
            {h("directionalLight", { position: [-3, 2, -1], intensity: 0.4, color: "#D4AF37" })}
            {h("pointLight", { position: [0, 2, 2], intensity: 0.5 })}
            {h(
              Suspense,
              { fallback: null },
              h(Environment, { preset: "studio", background: false, environmentIntensity: 0.45 }),
              h(Piece, {
                key: `${shape}-${palette?.id || "none"}`,
                shape,
                palette,
                textureUrl: null,
              })
            )}
            {h(ContactShadows, { position: [0, -1.2, 0], opacity: 0.45, scale: 6, blur: 2.4, far: 3 })}
            {h(OrbitControls, { enablePan: false, enableZoom: true, minDistance: 2.4, maxDistance: 5 })}
          </Canvas>
        </ThreeBoundary>
      )}
    </div>
  );
}

/**
 * CompareView3D — renderiza a MESMA peça 3D lado a lado, uma com as cores da
 * paleta A e outra com as cores da paleta B. Permite trocar o tipo de peça
 * (geodo / bandeja / colar) e atualiza em tempo real ao alternar paletas.
 */
export default function CompareView3D({ paletteA, paletteB }) {
  const [shape, setShape] = useState("geodo");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="mt-8 glass-strong rounded-sm p-6 relative overflow-hidden"
      data-testid="compare-3d-card"
    >
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="label-eyebrow text-gold inline-flex items-center gap-2">
              <BoxIcon className="w-3 h-3" /> Comparação 3D
            </div>
            <h3 className="font-display text-2xl tracking-tight mt-1">
              Mesma peça, <span className="italic gold-shimmer">duas paletas</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Veja como cada paleta veste a mesma forma. Arraste para girar.
            </p>
          </div>

          <div className="flex gap-1.5" data-testid="compare-3d-shape-selector">
            {SHAPES.map((s) => {
              const isActive = shape === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShape(s.id)}
                  className={`relative px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm border transition-all ${
                    isActive
                      ? "border-gold text-ink bg-gold shadow-gold font-semibold"
                      : "border-black/15 text-zinc-500 hover:border-gold/40"
                  }`}
                  data-testid={`compare-3d-shape-${s.id}`}
                >
                  {s.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4" data-testid="compare-3d-canvases">
          <div className="space-y-2">
            <PreviewCanvas palette={paletteA} shape={shape} label="A" testid="compare-3d-canvas-a" />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-400 truncate">{paletteA?.name}</span>
              <PaletteSwatches palette={paletteA} />
            </div>
          </div>
          <div className="space-y-2">
            <PreviewCanvas palette={paletteB} shape={shape} label="B" testid="compare-3d-canvas-b" />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-400 truncate">{paletteB?.name}</span>
              <PaletteSwatches palette={paletteB} />
            </div>
          </div>
        </div>

        <div
          className="mt-4 flex items-start gap-2 text-xs text-zinc-300 leading-relaxed"
          data-testid="compare-3d-instructions"
        >
          <MousePointerClick className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
          <p>
            <span className="text-zinc-100 font-medium">Arraste</span> cada peça para girar ·
            <span className="text-zinc-100 font-medium"> Scroll</span> para zoom. Troque o
            tipo de peça acima para ver outra forma com as duas paletas aplicadas.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
