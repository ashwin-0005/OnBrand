"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const W = 512;
const H = 200;

/** Draws a draft-pink card with a coral flag bar and the risky sentence into a texture (no font downloads). */
function useCardTexture(text: string, tag: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f6e4df";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 36);
    ctx.fill();
    ctx.fillStyle = "#e07a5f";
    ctx.fillRect(28, 36, 8, H - 72);
    ctx.fillStyle = "#a8442c";
    ctx.font = "600 22px Inter, system-ui, sans-serif";
    ctx.fillText(`⚑ ${tag}`, 56, 60);
    ctx.fillStyle = "#16181d";
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    // Simple word wrap.
    const words = text.split(" ");
    let line = "";
    let y = 108;
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > W - 90) {
        ctx.fillText(line, 56, y);
        line = w;
        y += 40;
      } else line = next;
    }
    ctx.fillText(line, 56, y);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [text, tag]);
}

interface Props {
  text: string;
  tag: string;
  index: number;
  total: number;
}

/** A flat rounded draft card orbiting the shield. Cards further back fade (fake depth-of-field). */
export function FloatingDraftCard({ text, tag, index, total }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useCardTexture(text, tag);
  const phase = (index / total) * Math.PI * 2;
  const radius = 2.6 + (index % 2) * 0.4;
  const yBase = ((index % 3) - 1) * 0.9;

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m || !mat.current) return;
    const a = phase + clock.elapsedTime * 0.12;
    const z = Math.sin(a) * 1.6;
    m.position.set(Math.cos(a) * radius, yBase + Math.sin(clock.elapsedTime * 0.6 + index) * 0.12, z);
    m.rotation.set(0.05, -Math.cos(a) * 0.35, (index % 2 ? 1 : -1) * 0.06);
    // Front cards crisp, back cards faded.
    mat.current.opacity = THREE.MathUtils.mapLinear(z, -1.6, 1.6, 0.25, 1);
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[1.7, (1.7 * H) / W]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
