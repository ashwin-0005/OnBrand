// Flags horizontal scrolling at narrow/wide widths (responsive check).
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3001";
const exe = process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: exe });
let bad = 0;
for (const width of [360, 768, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  for (const path of ["/", "/review", "/insights", "/admin", "/login"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) bad++;
    console.log(`${width}px ${path}: ${over > 0 ? `OVERFLOWS by ${over}px` : "ok"}`);
  }
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
