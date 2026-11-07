"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DEPTH = 0.35;
const MAX_TILT = THREE.MathUtils.degToRad(10);

/** One half of the shield outline. side = -1 (left) or 1 (right). */
function halfShape(side: 1 | -1) {
  const s = new THREE.Shape();
  s.moveTo(0, 1.4);
  s.lineTo(1.2 * side, 1.0);
  s.lineTo(1.2 * side, 0.1);
  s.quadraticCurveTo(1.2 * side, -0.9, 0, -1.45);
  s.lineTo(0, 1.4);
  return s;
}

function useHalf(side: 1 | -1) {
  return useMemo(() => {
    const g = new THREE.ExtrudeGeometry(halfShape(side), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.06,
      bevelSegments: 3,
      curveSegments: 16,
    });
    g.translate(0, 0, -DEPTH / 2);
    return g;
  }, [side]);
}

/** Soft radial glow sprite behind the shield (cheap stand-in for bloom). */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(224,122,95,0.55)");
    g.addColorStop(0.5, "rgba(217,178,95,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

export function Shield3D({ mouse }: { mouse: RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const left = useHalf(-1);
  const right = useHalf(1);
  const glow = useGlowTexture();

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const m = mouse.current ?? { x: 0, y: 0 };
    // Slow idle sway + damped mouse parallax (max ~10 degrees each way).
    g.rotation.y = Math.sin(t * 0.35) * 0.35 + m.x * MAX_TILT;
    g.rotation.x = -m.y * MAX_TILT;
    g.position.y = Math.sin(t * 0.8) * 0.08;
  });

  return (
    <group ref={group}>
      <sprite scale={[5, 5, 1]} position={[0, 0, -0.6]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh geometry={left}>
        {/* Polished copper */}
        <meshStandardMaterial color="#e8896d" metalness={1} roughness={0.32} envMapIntensity={1.4} />
      </mesh>
      <mesh geometry={right}>
        {/* Mirror chrome */}
        <meshPhysicalMaterial
          color="#eef1f5"
          metalness={1}
          roughness={0.26}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.6}
        />
      </mesh>
    </group>
  );
}
