// Runs axe-core (WCAG 2.0/2.1/2.2 A + AA) on every page using the installed Edge/Chrome.
// Usage: node scripts/axe.mjs [baseUrl]   (BROWSER_PATH env var overrides the browser)
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const exe = process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const pages = ["/", "/review", "/insights", "/admin", "/login"];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const browser = await chromium.launch({ executablePath: exe });
let total = 0;
for (const reduced of [false, true]) {
  const ctx = await browser.newContext({
    // Reduced pass = user ticked the navbar toggle (the site ignores the OS setting by design).
    reducedMotion: reduced ? "reduce" : "no-preference",
    viewport: { width: 1280, height: 900 },
  });
  if (reduced) await ctx.addInitScript(() => sessionStorage.setItem("onbrand.reduceMotion", "true"));
  for (const path of pages) {
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    // Exercise the review flow so findings, dialogs and tabs get audited too.
    if (path === "/review") {
      await page.getByRole("button", { name: "Check content" }).click();
      await page.getByText("Review complete", { exact: false }).waitFor({ state: "attached" });
      await page.waitForTimeout(2500);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const r = await new AxeBuilder({ page }).withTags(tags).analyze();
    total += r.violations.length;
    console.log(
      `${reduced ? "[reduced] " : ""}${path}: ${r.violations.length} violations, ${r.passes.length} passed rules`,
    );
    for (const v of r.violations)
      console.log(`  - ${v.id} (${v.impact}): ${v.help} [${v.nodes.length}] e.g. ${v.nodes[0]?.target}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
process.exit(total ? 1 : 0);
