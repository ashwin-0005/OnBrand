"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Shield3D } from "./Shield3D";
import { MetalStudio } from "./MetalStudio";
import { ParticleField } from "./ParticleField";
import { cardTexture, labelTexture } from "./three-utils";
import { useMousePosition } from "@/hooks/useMousePosition";

const { damp, clamp } = THREE.MathUtils;
const CARD = { w: 2.4, h: 1.2 };
const CUBE_POS = new THREE.Vector3(-1.75, 1.25, -0.4);
const SHEET_START = [
  new THREE.Vector3(-3.4, 2.6, 0.6),
  new THREE.Vector3(-3.6, 0.4, 0.8),
  new THREE.Vector3(-0.6, 2.9, 0.4),
  new THREE.Vector3(-3.1, 1.8, 1.4),
];
const EDGE_BOX = new THREE.BoxGeometry(0.92, 0.92, 0.92);
const TRAIL = ["✓ Submitted · Priya", "✓ 2 findings cited", "✓ Fix accepted", "✓ Approved · Diego"];
const BUTTONS = [
  { text: "Accept", bg: "#3cc29a", fg: "#08090c" },
  { text: "Edit", bg: "#ffffff", fg: "#16181d" },
  { text: "Dispute", bg: "#ffffff", fg: "#16181d" },
];

const mat = (o: THREE.Object3D) => (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
const easeOutBack = (p: number) => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);

/** Pinned 3D scene for the "How it works" story. step 0-5 = Import, Submit, Analyse, Explain, Decide, Approve. */
function Scene({ step }: { step: number }) {
  const mouse = useMousePosition(0.05);
  const { viewport } = useThree();
  const root = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Group>(null);
  const cubeMat = useRef<THREE.MeshStandardMaterial>(null);
  const sheets = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const cardMat = useRef<THREE.MeshBasicMaterial>(null);
  const beam = useRef<THREE.Mesh>(null);
  const flags = useRef<THREE.Group>(null);
  const buttons = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Group>(null);
  const changedAt = useRef(0);
  const lastStep = useRef(-1);

  const tex = useMemo(() => {
    const plain = cardTexture("plain");
    return {
      plain: plain.texture,
      flagged: cardTexture("flagged").texture,
      approved: cardTexture("approved").texture,
      marks: plain.marks,
      flagLabels: plain.marks.map((m) => labelTexture(`${m.label}`, { bg: "#e07a5f", fg: "#08090c", size: 40 })),
      buttons: BUTTONS.map((b) => labelTexture(b.text, { bg: b.bg, fg: b.fg, w: 320, h: 112 })),
      stamp: labelTexture("APPROVED", {
        bg: "rgba(222,243,234,0.9)",
        fg: "#1a7357",
        border: "#1a7357",
        size: 54,
        radius: 18,
      }),
      trail: TRAIL.map((t) =>
        labelTexture(t, { bg: "rgba(255,255,255,0.14)", fg: "#ffffff", w: 560, h: 96, size: 36, radius: 20 }),
      ),
      sheet: labelTexture("≡", { bg: "#ffffff", fg: "#3d4a63", w: 96, h: 128, size: 64, radius: 12 }),
    };
  }, []);

  const map = step >= 5 ? tex.approved : step >= 3 ? tex.flagged : tex.plain;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (lastStep.current !== step) {
      lastStep.current = step;
      changedAt.current = t;
    }
    const since = t - changedAt.current;

    // Whole scene: fit to the column width + gentle damped mouse parallax.
    if (root.current) {
      const s = Math.min(1.25, viewport.width / 6);
      root.current.scale.setScalar(s);
      root.current.position.x = -0.35 * s;
      root.current.rotation.y = damp(root.current.rotation.y, (mouse.current?.x ?? 0) * 0.15, 4, dt);
      root.current.rotation.x = damp(root.current.rotation.x, -(mouse.current?.y ?? 0) * 0.08, 4, dt);
    }

    // 1. Import: knowledge-base cube glows, sheets fly in.
    if (cube.current && cubeMat.current) {
      cube.current.rotation.y += dt * 0.35;
      cubeMat.current.emissiveIntensity = damp(cubeMat.current.emissiveIntensity, step === 0 ? 1.4 : 0.25, 4, dt);
    }
    sheets.current?.children.forEach((s, i) => {
      const p = (t * 0.55 + i * 0.25) % 1;
      const on = step === 0;
      s.position.lerpVectors(SHEET_START[i], CUBE_POS, p * p);
      s.rotation.z = (1 - p) * (i % 2 ? 0.6 : -0.6);
      const target = on ? 1 - p * 0.75 : 0;
      s.scale.setScalar(damp(s.scale.x, target, 8, dt));
    });

    // 2. Submit: draft card slides toward the shield.
    if (card.current && cardMat.current) {
      const on = step >= 1;
      card.current.position.x = damp(card.current.position.x, on ? -0.35 : -4.5, 3, dt);
      card.current.position.y = -0.15 + Math.sin(t * 0.8) * 0.04;
      card.current.rotation.y = damp(card.current.rotation.y, on ? 0.22 : 0.8, 3, dt);
      cardMat.current.opacity = damp(cardMat.current.opacity, on ? 1 : 0, 4, dt);
    }

    // 3. Analyse: scanning beam sweeps the card.
    if (beam.current) {
      const on = step === 2;
      beam.current.position.x = -CARD.w / 2 + ((since * 0.7) % 1) * CARD.w;
      mat(beam.current).opacity = damp(mat(beam.current).opacity, on ? 0.85 : 0, 6, dt);
    }

    // 4. Explain: flag markers pop onto risky words (staggered spring-ish pop).
    flags.current?.children.forEach((f, i) => {
      const p = step >= 3 ? clamp((since - 0.2 - i * 0.18) / 0.45, 0, 1) : 0;
      const s = step > 3 ? 1 : step === 3 ? easeOutBack(p) : damp(f.scale.x, 0, 10, dt);
      f.scale.setScalar(Math.max(0.0001, s));
      f.position.z = 0.06 + Math.sin(t * 2 + i) * 0.02;
    });

    // 5. Decide: three buttons float up beside the card.
    buttons.current?.children.forEach((b, i) => {
      const on = step >= 4 && (step > 4 || since > i * 0.1);
      b.position.y = damp(b.position.y, on ? -1.05 : -1.7, 6, dt);
      mat(b).opacity = damp(mat(b).opacity, on ? 1 : 0, 6, dt);
    });

    // 6. Approve: stamp lands, history trail appears.
    if (stamp.current) {
      const p = step >= 5 ? clamp(since / 0.45, 0, 1) : 0;
      const e = p * p;
      stamp.current.position.z = 0.08 + (1 - e) * 2.5;
      stamp.current.scale.setScalar(step >= 5 ? 2 - e : 0.0001);
      stamp.current.rotation.z = -0.22 - (1 - e) * 0.5;
      mat(stamp.current).opacity = step >= 5 ? e : 0;
    }
    trail.current?.children.forEach((r, i) => {
      const on = step >= 5 && since > 0.4 + i * 0.12;
      r.position.x = damp(r.position.x, on ? 0 : 0.6, 6, dt);
      mat(r).opacity = damp(mat(r).opacity, on ? 1 : 0, 6, dt);
    });
  });

  return (
    <group ref={root}>
      <ParticleField count={60} />

      {/* Knowledge base */}
      <group ref={cube} position={CUBE_POS} rotation={[0.45, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial
            ref={cubeMat}
            color="#8e98a8"
            metalness={1}
            roughness={0.18}
            emissive="#d9b25f"
            emissiveIntensity={1.4}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[EDGE_BOX]} />
          <lineBasicMaterial color="#e8ebf0" />
        </lineSegments>
      </group>
      <group ref={sheets}>
        {SHEET_START.map((p, i) => (
          <mesh key={i} position={p} scale={0.0001}>
            <planeGeometry args={[0.32, 0.42]} />
            <meshBasicMaterial map={tex.sheet} transparent toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Shield */}
      <group position={[1.85, 0.75, -0.6]} scale={0.6}>
        <Shield3D mouse={mouse} />
      </group>

      {/* Draft card + everything that lives on it */}
      <group ref={card} position={[-4.5, -0.15, 0]} rotation={[0, 0.8, 0]}>
        <mesh>
          <planeGeometry args={[CARD.w, CARD.h]} />
          <meshBasicMaterial ref={cardMat} map={map} transparent opacity={0} toneMapped={false} />
        </mesh>
        <mesh ref={beam} position={[0, 0, 0.03]} renderOrder={2}>
          <planeGeometry args={[0.18, CARD.h * 1.05]} />
          <meshBasicMaterial
            color="#d9b25f"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group ref={flags} renderOrder={1}>
          {tex.marks.map((m, i) => (
            <group key={m.label} position={[(m.u - 0.5) * CARD.w, (0.5 - m.v) * CARD.h, 0.06]} scale={0.0001}>
              <mesh position={[0, 0.12 + i * 0.09, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.24 + i * 0.18, 6]} />
                <meshBasicMaterial color="#e07a5f" />
              </mesh>
              <mesh position={[i ? -0.3 : 0.3, 0.32 + i * 0.18, 0]}>
                <planeGeometry args={[0.95, 0.21]} />
                <meshBasicMaterial map={tex.flagLabels[i]} transparent toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
        <group ref={buttons}>
          {tex.buttons.map((b, i) => (
            <mesh key={i} position={[-0.75 + i * 0.68, -1.7, 0.1]}>
              <planeGeometry args={[0.6, 0.21]} />
              <meshBasicMaterial map={b} transparent opacity={0} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <mesh ref={stamp} position={[0.72, -0.38, 0.08]} scale={0.0001} renderOrder={3}>
          <planeGeometry args={[0.85, 0.19]} />
          <meshBasicMaterial map={tex.stamp} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      {/* History trail */}
      <group ref={trail} position={[1.85, -0.55, 0]}>
        {tex.trail.map((r, i) => (
          <mesh key={i} position={[0.6, -i * 0.24, 0]}>
            <planeGeometry args={[1.15, 0.2]} />
            <meshBasicMaterial map={r} transparent opacity={0} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function StoryCanvas({ step, running }: { step: number; running: boolean }) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 2]}
      frameloop={running ? "always" : "never"}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <pointLight position={[-3, -1, 3]} intensity={8} color="#d9b25f" />
      <MetalStudio />
      <Scene step={step} />
    </Canvas>
  );
}
