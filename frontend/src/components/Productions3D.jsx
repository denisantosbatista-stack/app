import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useTexture, Environment } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Box as BoxIcon, MousePointerClick, RefreshCw, AlertCircle, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { chamarIA, ApiError } from "@/utils/api";

// Timeout (ms) para fallback de UI caso a geração trave (Nano Banana ~30s típico).
const RENDER_TIMEOUT_MS = 45000;

// Fallback hex para quando a paleta vier vazia ou com < 4 cores — evita "blob branco"
// porque Three.js usa #ffffff como cor padrão se a entrada for undefined.
const FALLBACK_HEXES = ["#9B7B4A", "#D4AF37", "#1F2937", "#E5DCC9"];
function paletteToColors(palette) {
  const hexes = (palette?.colors || []).map((c) => c.hex);
  while (hexes.length < FALLBACK_HEXES.length) {
    hexes.push(FALLBACK_HEXES[hexes.length]);
  }
  return hexes.map((hex) => new THREE.Color(hex));
}

// Detecta suporte a WebGL no device. Em mobile antigo o Canvas pode falhar silenciosamente.
function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Error boundary para conter qualquer crash do react-three-fiber e mostrar fallback elegante.
class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    // Falha silenciosa — fallback visual já cobre o usuário.
    if (typeof console !== "undefined") console.warn("[Productions3D] WebGL fallback:", err?.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CanvasFallback({ palette, message }) {
  const colors = (palette?.colors || []).slice(0, 4);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="flex gap-1.5">
        {colors.map((c) => (
          <span
            key={c.hex}
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ background: c.hex }}
          />
        ))}
      </div>
      <BoxIcon className="w-5 h-5 text-gold-hover/70" />
      <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-400">
        {message || "Preparando cena 3D…"}
      </div>
    </div>
  );
}

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

/**
 * Productions3D — viewer Three.js (react-three-fiber + drei) com 3 formatos de peça
 * (geodo/bandeja/colar) renderizados em material físico (PBR) tingido com a paleta ativa.
 * Botão "Gerar render fotorrealista" usa Gemini 3.1 Flash Image Preview (Nano Banana)
 * via /api/ai/generate-image e aplica a imagem como textura no modelo 3D.
 */

// Mapeia a forma da peça selecionada na biblioteca para uma das 3 variações 3D.
// O usuário escolhe a peça em "Tipo de peça" e o viewer 3D adapta automaticamente.
function mapPieceTo3DShape(piece) {
  if (!piece) return "geodo";
  const s = piece.shape;
  // Peças planas / horizontais → bandeja
  if ([
    "tray", "coaster", "sousplat", "bowl", "jewelry-box",
    "planter", "book", "booklet", "ruler",
  ].includes(s)) return "bandeja";
  // Peças orgânicas / penduráveis → colar (gota/esfera)
  if ([
    "drop", "ring", "oval", "bracelet", "moon", "star",
    "heart", "circle", "feather", "leaf", "pen", "bookmark",
  ].includes(s)) return "colar";
  // Geométrico / em pé (prisma, hex, cubo) → geodo (icosaedro)
  if (["prism", "hex", "cube"].includes(s)) return "geodo";
  return "geodo";
}

function GeodoMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  const colors = palette.colors.map((c) => new THREE.Color(c.hex));
  const hasTex = !!texture;
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={hasTex ? "#ffffff" : colors[0]}
          metalness={hasTex ? 0.12 : 0.25}
          roughness={hasTex ? 0.35 : 0.28}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
          envMapIntensity={0.7}
          emissive={hasTex ? new THREE.Color("#ffffff") : colors[1]}
          emissiveMap={texture || null}
          emissiveIntensity={hasTex ? 0.25 : 0.04}
          toneMapped={true}
        />
      </mesh>
      {/* Veios dourados sutis */}
      <mesh>
        <icosahedronGeometry args={[1.105, 1]} />
        <meshBasicMaterial color="#D4AF37" wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

function BandejaMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.2;
  });
  const colors = palette.colors.map((c) => new THREE.Color(c.hex));
  const hasTex = !!texture;
  return (
    <group ref={ref}>
      <mesh rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.18, 64]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={hasTex ? "#ffffff" : colors[0]}
          metalness={hasTex ? 0.1 : 0.3}
          roughness={hasTex ? 0.3 : 0.25}
          clearcoat={0.55}
          clearcoatRoughness={0.3}
          envMapIntensity={0.75}
          emissive={hasTex ? new THREE.Color("#ffffff") : new THREE.Color("#000000")}
          emissiveMap={texture || null}
          emissiveIntensity={hasTex ? 0.22 : 0}
        />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-0.25, 0, 0]}>
        <torusGeometry args={[1.3, 0.04, 24, 64]} />
        <meshPhysicalMaterial color="#D4AF37" metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ColarMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  const colors = palette.colors.map((c) => new THREE.Color(c.hex));
  const hasTex = !!texture;
  return (
    <group ref={ref}>
      {/* gota principal */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.75, 64, 64]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={hasTex ? "#ffffff" : colors[0]}
          metalness={hasTex ? 0.1 : 0.25}
          roughness={hasTex ? 0.28 : 0.28}
          clearcoat={0.55}
          clearcoatRoughness={0.3}
          envMapIntensity={0.7}
          emissive={hasTex ? new THREE.Color("#ffffff") : (colors[2] || colors[1])}
          emissiveMap={texture || null}
          emissiveIntensity={hasTex ? 0.25 : 0.06}
        />
      </mesh>
      {/* alça dourada */}
      <mesh position={[0, 0.7, 0]}>
        <torusGeometry args={[0.18, 0.04, 16, 48]} />
        <meshPhysicalMaterial color="#D4AF37" metalness={1} roughness={0.18} />
      </mesh>
    </group>
  );
}

function PieceWithTexture({ shape, palette, textureUrl }) {
  const tex = useTexture(textureUrl);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (shape === "bandeja") return <BandejaMesh palette={palette} texture={tex} />;
  if (shape === "colar") return <ColarMesh palette={palette} texture={tex} />;
  return <GeodoMesh palette={palette} texture={tex} />;
}

function Piece({ shape, palette, textureUrl }) {
  if (textureUrl) {
    return <PieceWithTexture shape={shape} palette={palette} textureUrl={textureUrl} />;
  }
  if (shape === "bandeja") return <BandejaMesh palette={palette} texture={null} />;
  if (shape === "colar") return <ColarMesh palette={palette} texture={null} />;
  return <GeodoMesh palette={palette} texture={null} />;
}

export default function Productions3D({ palette, activePiece }) {
  const [shape, setShape] = useState(() => mapPieceTo3DShape(activePiece));
  const [textureUrl, setTextureUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100 simulado
  const [error, setError] = useState(null);
  const [webglReady, setWebglReady] = useState(null);
  const [canvasMounted, setCanvasMounted] = useState(false);

  useEffect(() => {
    setWebglReady(detectWebGL());
  }, []);

  // Quando a paleta muda, limpa a textura gerada anteriormente (era da paleta antiga).
  useEffect(() => {
    setTextureUrl(null);
    setError(null);
  }, [palette?.id]);

  // Sincroniza shape com a peça ativa selecionada na biblioteca da Studio.
  useEffect(() => {
    if (!activePiece) return;
    const mapped = mapPieceTo3DShape(activePiece);
    setShape((prev) => (prev === mapped ? prev : mapped));
    setTextureUrl(null);
  }, [activePiece?.id]);

  // Progresso simulado durante geração (~30s estimados). Para quando loading termina.
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return undefined;
    }
    const start = Date.now();
    const total = 30000; // 30s de estimativa
    const itv = setInterval(() => {
      const pct = Math.min(95, ((Date.now() - start) / total) * 100);
      setProgress(pct);
    }, 250);
    return () => clearInterval(itv);
  }, [loading]);

  const hexColors = useMemo(
    () => (palette?.colors || []).map((c) => c.hex),
    [palette]
  );

  if (!palette || !palette.colors?.length) {
    return (
      <div
        className="glass rounded-sm p-6 text-center text-xs text-zinc-500 tracking-wide"
        data-testid="productions-3d-empty"
      >
        Gere uma paleta para visualizar suas produções em 3D.
      </div>
    );
  }

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const tid = toast.loading("Renderizando peça fotorrealista… (~30s)", { icon: "✨" });

    try {
      const data = await chamarIA("/ai/generate-image", {
        prompt: `Peça em formato de ${shape} aplicando a paleta "${palette.name}"`,
        colors: hexColors,
        shape,
        style: palette.style || null,
        palette_name: palette.name || null,
      }, { timeoutMs: RENDER_TIMEOUT_MS, maxTentativas: 2 });
      const dataUrl = `data:${data.mime_type || "image/png"};base64,${data.image_base64}`;
      setProgress(100);
      setTextureUrl(dataUrl);
      toast.success("Render aplicado ao 3D!", { id: tid });
    } catch (e) {
      let msg;
      if (e instanceof ApiError && e.tipo === "timeout") {
        msg = "Renderização demorou mais que 45s. Tente novamente.";
      } else if (e instanceof ApiError && e.tipo === "saldo") {
        msg = "Saldo do Universal Key esgotado. Recarregue para gerar renders.";
      } else {
        msg = `Falha render: ${e?.message || "erro desconhecido"}`;
      }
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="glass-strong rounded-sm p-6 relative overflow-hidden"
      data-testid="productions-3d-card"
    >
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="label-eyebrow text-gold inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Galeria 3D
            </div>
            <h3 className="font-display text-2xl tracking-tight mt-1">
              Produções em <span className="italic gold-shimmer">3D interativo</span>
            </h3>
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-gold/40 bg-gold/5 text-[10px] uppercase tracking-[0.18em] text-gold-deep"
            data-testid="prod3d-active-piece"
          >
            <BoxIcon className="w-3 h-3" />
            {activePiece?.label || "—"}
          </div>
        </div>

        <div
          className="aspect-[16/10] rounded-sm overflow-hidden border border-black/10 relative"
          style={{ background: "#0a0a0a" }}
          data-testid="prod3d-canvas"
        >
          {/* Skeleton/loader enquanto WebGL inicializa ou se não houver suporte */}
          {(!canvasMounted || webglReady === false) && (
            <CanvasFallback
              palette={palette}
              message={
                webglReady === false
                  ? "3D indisponível neste dispositivo"
                  : "Inicializando cena 3D…"
              }
            />
          )}
          {webglReady && (
            <ThreeErrorBoundary
              fallback={
                <CanvasFallback
                  palette={palette}
                  message="3D indisponível neste dispositivo"
                />
              }
            >
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.6, 3.4], fov: 38 }}
                onCreated={() => setCanvasMounted(true)}
                style={{ width: "100%", height: "100%" }}
                gl={{ toneMappingExposure: 0.95 }}
              >
                <color attach="background" args={["#0a0a0c"]} />
                <ambientLight intensity={0.35} />
                <hemisphereLight args={["#ffffff", "#1a1a1f", 0.25]} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} />
                <directionalLight
                  position={[-3, 2, -1]}
                  intensity={0.4}
                  color="#D4AF37"
                />
                <pointLight position={[0, 2, 2]} intensity={0.5} />
                <Suspense fallback={null}>
                  <Environment preset="studio" background={false} environmentIntensity={0.45} />
                  <Piece shape={shape} palette={palette} textureUrl={textureUrl} />
                </Suspense>
                <ContactShadows
                  position={[0, -1.2, 0]}
                  opacity={0.45}
                  scale={6}
                  blur={2.4}
                  far={3}
                />
                <OrbitControls
                  enablePan={false}
                  enableZoom
                  minDistance={2.4}
                  maxDistance={5}
                />
              </Canvas>
            </ThreeErrorBoundary>
          )}

          {/* Overlay de loading sobre o canvas — feedback visível durante ~30s */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 backdrop-blur-sm gap-4 px-6 z-10"
                data-testid="prod3d-loading-overlay"
              >
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
                <div className="text-center">
                  <div className="text-sm text-zinc-100 font-medium tracking-wide">
                    Renderizando peça fotorrealista…
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 tracking-wide">
                    Isso leva cerca de 30 segundos
                  </div>
                </div>
                <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold to-gold-hover"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Banner de erro com retry — substitui o silêncio anterior em caso de falha */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-start gap-3 p-3 rounded-sm border border-red-500/30 bg-red-500/10"
              data-testid="prod3d-error-banner"
            >
              <AlertCircle className="w-4 h-4 text-red-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-xs text-red-100 leading-relaxed">
                {error}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm border border-red-300/40 text-red-100 hover:bg-red-500/20 inline-flex items-center gap-1.5"
                data-testid="prod3d-retry-btn"
              >
                <RefreshCw className="w-3 h-3" /> Tentar novamente
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          title="Cria uma imagem fotorrealista da peça com IA e aplica como textura no modelo 3D"
          className="btn-gold mt-5 w-full px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="prod3d-generate-btn"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {loading ? `Renderizando… ${Math.round(progress)}%` : `✨ ${activePiece?.label || "Peça"} realista`}
        </button>

        <div className="mt-4 flex items-start gap-2 text-xs text-zinc-300 leading-relaxed" data-testid="prod3d-instructions">
          <MousePointerClick className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
          <p>
            <span className="text-zinc-100 font-medium">Arraste</span> o modelo para rotacionar ·
            <span className="text-zinc-100 font-medium"> Scroll</span> para zoom. Ao gerar o render IA,
            a imagem fotorrealista é aplicada como textura na peça 3D em tempo real.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
