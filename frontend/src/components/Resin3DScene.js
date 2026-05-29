// Scene 3D usando React.createElement direto para evitar que o plugin
// visual-edits do Emergent injete x-line-number/x-file-name nos elementos
// intrinsics do react-three-fiber (mesh, geometry, material...), o que
// quebra applyProps em R3F v9.
import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

const h = React.createElement;

function makeColors(palette) {
  return (palette?.colors || []).map((c) => new THREE.Color(c.hex));
}

function GeodoMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  const colors = makeColors(palette);
  return h(
    "group",
    { ref },
    h(
      "mesh",
      null,
      h("icosahedronGeometry", { args: [1.1, 1] }),
      h("meshPhysicalMaterial", {
        map: texture || null,
        color: texture ? "#ffffff" : colors[0],
        metalness: 0.35,
        roughness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.2,
        emissive: colors[1],
        emissiveIntensity: 0.12,
      })
    )
  );
}

function BandejaMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.18;
  });
  const colors = makeColors(palette);
  return h(
    "group",
    { ref },
    h(
      "mesh",
      { rotation: [-0.25, 0, 0] },
      h("cylinderGeometry", { args: [1.3, 1.3, 0.18, 64] }),
      h("meshPhysicalMaterial", {
        map: texture || null,
        color: texture ? "#ffffff" : colors[0],
        metalness: 0.4,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.4,
      })
    ),
    h(
      "mesh",
      { position: [0, 0.1, 0], rotation: [-0.25, 0, 0] },
      h("torusGeometry", { args: [1.3, 0.04, 24, 64] }),
      h("meshPhysicalMaterial", { color: "#D4AF37", metalness: 1, roughness: 0.2 })
    )
  );
}

function ColarMesh({ palette, texture }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  const colors = makeColors(palette);
  return h(
    "group",
    { ref },
    h(
      "mesh",
      { position: [0, -0.2, 0] },
      h("sphereGeometry", { args: [0.75, 64, 64] }),
      h("meshPhysicalMaterial", {
        map: texture || null,
        color: texture ? "#ffffff" : colors[0],
        metalness: 0.3,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.3,
        emissive: colors[2] || colors[1],
        emissiveIntensity: 0.18,
      })
    ),
    h(
      "mesh",
      { position: [0, 0.7, 0] },
      h("torusGeometry", { args: [0.18, 0.04, 16, 48] }),
      h("meshPhysicalMaterial", { color: "#D4AF37", metalness: 1, roughness: 0.18 })
    )
  );
}

function PieceWithTexture({ shape, palette, textureUrl }) {
  const tex = useTexture(textureUrl);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (shape === "bandeja") return h(BandejaMesh, { palette, texture: tex });
  if (shape === "colar") return h(ColarMesh, { palette, texture: tex });
  return h(GeodoMesh, { palette, texture: tex });
}

export function Piece({ shape, palette, textureUrl }) {
  if (textureUrl) {
    return h(PieceWithTexture, { shape, palette, textureUrl });
  }
  if (shape === "bandeja") return h(BandejaMesh, { palette, texture: null });
  if (shape === "colar") return h(ColarMesh, { palette, texture: null });
  return h(GeodoMesh, { palette, texture: null });
}

export function SceneEnv() {
  // Light setup via createElement to bypass visual-edits attribute injection
  return h(
    React.Fragment,
    null,
    h("color", { attach: "background", args: ["#0a0a0c"] }),
    h("ambientLight", { intensity: 0.45 }),
    h("directionalLight", { position: [2, 3, 2], intensity: 1.2 })
  );
}
