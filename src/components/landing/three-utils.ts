import * as THREE from "three";

const FONT = "Inter, system-ui, sans-serif";

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Rounded pill/label drawn to a texture (no font downloads). */
export function labelTexture(
  text: string,
  o: { bg: string; fg: string; border?: string; w?: number; h?: number; size?: number; radius?: number },
) {
  const w = o.w ?? 512;
  const h = o.h ?? 112;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = o.bg;
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, o.radius ?? (h - 12) / 2);
  ctx.fill();
  if (o.border) {
    ctx.lineWidth = 10;
    ctx.strokeStyle = o.border;
    ctx.stroke();
  }
  ctx.fillStyle = o.fg;
  ctx.font = `700 ${o.size ?? 44}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);
  return finish(c);
}

export const CARD_W = 1024;
export const CARD_H = 512;
export type CardMode = "plain" | "flagged" | "approved";
export interface CardMark {
  u: number;
  v: number;
  label: string;
}

/** The draft card. Flagged words get coral highlights (green once approved); returns where they are (UV). */
export function cardTexture(mode: CardMode): { texture: THREE.CanvasTexture; marks: CardMark[] } {
  const c = document.createElement("canvas");
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = mode === "approved" ? "#def3ea" : "#f6e4df";
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, 64);
  ctx.fill();
  ctx.fillStyle = mode === "approved" ? "#3cc29a" : "#e07a5f";
  ctx.fillRect(56, 70, 12, CARD_H - 140);
  ctx.fillStyle = "#555b66";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("Draft · Social post", 100, 110);

  const lines: [string, string | null][][] = [
    [
      ["Our app is the ", null],
      ["#1 fastest", "Claims Policy 3.2"],
      [" in the", null],
    ],
    [
      ["market. ", null],
      ["Guaranteed", "Claims Policy 3.4"],
    ],
    [["results in 7 days!", null]],
  ];
  ctx.font = `700 58px ${FONT}`;
  const marks: CardMark[] = [];
  lines.forEach((segs, li) => {
    let x = 100;
    const y = 210 + li * 92;
    for (const [text, label] of segs) {
      const w = ctx.measureText(text).width;
      if (label) {
        if (mode !== "plain") {
          ctx.fillStyle = mode === "approved" ? "rgba(60,194,154,0.35)" : "rgba(224,122,95,0.45)";
          ctx.beginPath();
          ctx.roundRect(x - 8, y - 56, w + 16, 76, 12);
          ctx.fill();
        }
        marks.push({ u: (x + w / 2) / CARD_W, v: (y - 56) / CARD_H, label });
      }
      ctx.fillStyle = "#16181d";
      ctx.fillText(text, x, y);
      x += w;
    }
  });
  return { texture: finish(c), marks };
}
