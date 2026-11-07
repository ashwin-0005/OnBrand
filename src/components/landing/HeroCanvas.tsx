"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { MetalStudio } from "./MetalStudio";
import { Shield3D } from "./Shield3D";
import { FloatingDraftCard } from "./FloatingDraftCard";
import { ParticleField } from "./ParticleField";
import { useMousePosition } from "@/hooks/useMousePosition";
import { heroDrafts } from "@/mocks/drafts";

/** Spins and lifts the shield as you scroll out of the hero (scroll-linked, damped). */
function ScrollRig({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const p = Math.min(1, window.scrollY / window.innerHeight);
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, p * Math.PI * 1.5, 5, dt);
    g.current.position.y = THREE.MathUtils.damp(g.current.position.y, p * 1.2, 5, dt);
    g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, 1 + p * 0.25, 5, dt));
  });
  return <group ref={g}>{children}</group>;
}

/** The actual WebGL scene. Loaded lazily (next/dynamic, ssr:false) by HeroScene. */
export default function HeroCanvas({ running, lowPower }: { running: boolean; lowPower: boolean }) {
  const mouse = useMousePosition(0.06, running);
  const drafts = lowPower ? heroDrafts.slice(0, 4) : heroDrafts;

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, lowPower ? 1.5 : 2]}
      frameloop={running ? "always" : "never"}
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, -2, 3]} intensity={8} color="#d9b25f" />
      <ParticleField count={lowPower ? 50 : 140} />
      <MetalStudio />
      <ScrollRig>
        <Shield3D mouse={mouse} />
      </ScrollRig>
      {drafts.map((d, i) => (
        <FloatingDraftCard key={d.text} text={d.text} tag={d.tag} index={i} total={drafts.length} />
      ))}
    </Canvas>
  );
}
