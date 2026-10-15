#!/usr/bin/env node
/**
 * Phase 0 gate for the app: the web export renders in a real browser at
 * desktop, tablet and phone width with no console errors, no horizontal
 * overflow, and every button labelled. Run after `npm run build:web`.
 *
 *   node tools/verifyShell.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIST = path.resolve("dist");
const SHOTS = path.resolve("docs/shots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf" };

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("No dist/ — run `npm run build:web` first.");
  process.exit(1);
}
fs.mkdirSync(SHOTS, { recursive: true });

// SPA static server: unknown paths fall back to index.html, as on the web host.
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, "index.html");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "phone", width: 390, height: 844 },
];

const browser = await chromium.launch();
let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
  if (!ok) failures++;
};

for (const vp of viewports) {
  console.log(`\n${vp.name} ${vp.width}×${vp.height}`);
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByTestId("login-screen").waitFor({ timeout: 15000 });

  check(await page.getByRole("heading", { name: "Akbars Academy" }).isVisible(), "brand heading visible");
  check((await page.title()).includes("Akbars Academy"), `document title "${await page.title()}"`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `no horizontal overflow (${overflow}px)`);
  const unlabelled = await page.$$eval('[role="button"], button', (els) =>
    els.filter((e) => !(e.getAttribute("aria-label") || e.textContent || "").trim()).length,
  );
  check(unlabelled === 0, `every button labelled (${unlabelled} without a label)`);
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(" | ")}` : ""}`);

  await page.screenshot({ path: path.join(SHOTS, `shell-${vp.name}.png`), fullPage: true });
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll shell checks passed");
process.exit(failures ? 1 : 0);
