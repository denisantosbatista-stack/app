import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { chamarIA, ApiError } from "@/utils/api";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

/**
 * Productions3D — viewer Three.js (react-three-fiber + drei) com 3 formatos de peça
 * (geodo/bandeja/colar) renderizados em material físico (PBR) tingido com a paleta ativa.
 * Botão "Gerar render fotorrealista" usa Gemini 3.1 Flash Image Preview (Nano Banana)
 * via /api/ai/generate-image e aplica a imagem como textura no modelo 3D.
 */

const SHAPES = [
  { id: "geodo", label: "Geodo" },
  { id: "bandeja", label: "Bandeja" },
  { id: "colar", label: "Colar" },
];

function GeodoMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  const colors = palette.colors.map((c) => new THREE.Color(c.hex));
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={texture ? "#ffffff" : colors[0]}
          metalness={0.35}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.15}
          envMapIntensity={1.2}
          emissive={colors[1]}
          emissiveIntensity={0.12}
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
  return (
    <group ref={ref}>
      <mesh rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.18, 64]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={texture ? "#ffffff" : colors[0]}
          metalness={0.4}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.4}
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
  return (
    <group ref={ref}>
      {/* gota principal */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.75, 64, 64]} />
        <meshPhysicalMaterial
          map={texture || null}
          color={texture ? "#ffffff" : colors[0]}
          metalness={0.3}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.3}
          emissive={colors[2] || colors[1]}
          emissiveIntensity={0.18}
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

export default function Productions3D({ palette }) {
  const [shape, setShape] = useState("geodo");
  const [textureUrl, setTextureUrl] = useState(null);
  const [loading, setLoading] = useState(false);

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
    const tid = toast.loading("Nano Banana renderizando peça…", { icon: "🍌" });
    try {
      const data = await chamarIA("/ai/generate-image", {
        prompt: `Peça em formato de ${shape}, paleta "${palette.name}" — estilo ${palette.style}`,
        colors: hexColors,
        shape,
      });
      const dataUrl = `data:${data.mime_type || "image/png"};base64,${data.image_base64}`;
      setTextureUrl(dataUrl);
      toast.success("Render aplicado ao 3D!", { id: tid });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.tipo === "saldo"
          ? "Saldo do Universal Key esgotado. Recarregue para gerar renders."
          : `Falha render: ${e?.message || "erro"}`;
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
          <div className="flex gap-1.5">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setShape(s.id);
                  setTextureUrl(null);
                }}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm border transition-all ${
                  shape === s.id
                    ? "border-gold text-gold bg-gold/10"
                    : "border-black/15 text-zinc-500 hover:border-gold/40"
                }`}
                data-testid={`prod3d-shape-${s.id}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="aspect-[16/10] rounded-sm overflow-hidden bg-black border border-black/10"
          data-testid="prod3d-canvas"
        >
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.6, 3.4], fov: 38 }}
          >
            <color attach="background" args={["#0a0a0c"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 3, 2]} intensity={1.4} />
            <directionalLight position={[-3, 2, -1]} intensity={0.6} color="#D4AF37" />
            <pointLight position={[0, 2, 2]} intensity={0.8} />
            <Suspense fallback={null}>
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
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn-gold mt-5 w-full px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="prod3d-generate-btn"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          {loading ? "Renderizando…" : "Gerar render fotorrealista (Nano Banana)"}
        </button>

        <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
          Arraste o modelo para rotacionar · scroll para zoom. Ao gerar render IA,
          a imagem é aplicada como textura na peça 3D em tempo real.
        </p>
      </div>
    </motion.div>
  );
}
