"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Low-count drifting dust. Deterministic positions (seeded) so renders are stable. */
export function ParticleField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = rand() * 7;
      arr[i + 1] = rand() * 4;
      arr[i + 2] = rand() * 3 - 1.5;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ffffff" transparent opacity={0.55} depthWrite={false} sizeAttenuation />
    </points>
  );
}
