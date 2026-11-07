"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/preferences";

/**
 * Full-page liquid-metal background (raw WebGL fragment shader, no three.js).
 * Flows continuously, drifts with the mouse, and shifts chrome -> gold -> copper with scroll.
 * Rendered at half resolution (metal flow is soft, so it upscales cleanly) and paused when the tab is hidden.
 * Reduced motion: draws one still frame. Kept dark so white text stays above 4.5:1.
 */
const FRAG = `
precision mediump float;
uniform vec2 r; uniform float t; uniform float s; uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(gl_FragCoord.xy-.5*r)/r.y + m*.06;
  float T=t*.05;
  vec2 q=vec2(fbm(p*1.5+T),fbm(p*1.5-T+3.1));
  vec2 w=vec2(fbm(p*1.3+2.*q+vec2(1.7,9.2)+T*1.4),fbm(p*1.3+2.*q+vec2(8.3,2.8)-T));
  float f=fbm(p*1.1+2.6*w+s*1.2);
  float band=pow(.5+.5*cos(6.2831*(f*2.4+s*.8-T*.6)),7.);
  float edge=pow(.5+.5*cos(6.2831*(f*5.0+T)),18.);
  vec3 base=mix(vec3(.028,.031,.040),vec3(.105,.115,.140),smoothstep(.2,.9,f));
  vec3 chrome=vec3(.80,.83,.88), gold=vec3(.86,.70,.37), copper=vec3(.88,.48,.37);
  vec3 tint=mix(chrome,gold,smoothstep(.15,.55,s));
  tint=mix(tint,copper,smoothstep(.6,1.,s));
  vec3 col=base+tint*band*.15+chrome*edge*.05+tint*pow(f,4.)*.07;
  col*=1.-.45*pow(length(uv-vec2(.5,.45)),1.6);
  gl_FragColor=vec4(col,1.);
}`;
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

export function MetalBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cleanup = () => {};
    const init = () => {
      const canvas = ref.current;
      const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
      if (!canvas || !gl) return;

      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const u = {
        r: gl.getUniformLocation(prog, "r"),
        t: gl.getUniformLocation(prog, "t"),
        s: gl.getUniformLocation(prog, "s"),
        m: gl.getUniformLocation(prog, "m"),
      };

      const SCALE = 0.5;
      const resize = () => {
        canvas.width = Math.ceil(window.innerWidth * SCALE);
        canvas.height = Math.ceil(window.innerHeight * SCALE);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      let scroll = 0;
      const onMove = (e: PointerEvent) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      const scrollTarget = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return max > 0 ? window.scrollY / max : 0;
      };

      const draw = (time: number) => {
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        scroll += (scrollTarget() - scroll) * 0.06;
        gl.uniform2f(u.r, canvas.width, canvas.height);
        gl.uniform1f(u.t, time / 1000);
        gl.uniform1f(u.s, scroll);
        gl.uniform2f(u.m, mouse.x, mouse.y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      window.addEventListener("resize", resize);
      if (reduce) {
        draw(12000);
        cleanup = () => window.removeEventListener("resize", resize);
        return;
      }

      let raf = 0;
      const loop = (time: number) => {
        if (document.visibilityState === "visible") draw(time);
        raf = requestAnimationFrame(loop);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
      };
    };

    // Compile the shader only once the browser is idle, so it never competes with page load.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(init, { timeout: 2500 })
      : window.setTimeout(init, 800);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup();
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="bg-brand-gradient pointer-events-none fixed inset-0 -z-0 h-full w-full"
      style={{ imageRendering: "auto" }}
    />
  );
}
