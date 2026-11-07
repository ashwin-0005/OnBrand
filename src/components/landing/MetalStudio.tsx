"use client";

import { Environment, Lightformer } from "@react-three/drei";

/** Procedural studio reflections for metal materials. Rendered once (frames=1), no HDR download. */
export function MetalStudio() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={3} position={[0, 4, 3]} scale={[10, 1.5, 1]} />
      {/* Softbox in front of the subject: what chrome mostly reflects */}
      <Lightformer form="rect" intensity={1.6} position={[-2.5, 1, 6]} rotation-y={0.35} scale={[2.5, 9, 1]} />
      <Lightformer form="ring" intensity={4} color="#ffffff" position={[2.5, 2, 5]} scale={1.5} />
      <Lightformer intensity={2} color="#d9b25f" position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer intensity={1.6} color="#e07a5f" position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer intensity={1.2} position={[0, -4, 2]} rotation-x={-Math.PI / 2} scale={[10, 2, 1]} />
    </Environment>
  );
}
