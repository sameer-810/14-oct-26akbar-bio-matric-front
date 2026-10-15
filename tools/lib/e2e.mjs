/**
 * Shared set-up for the browser gates (tools/verify*.mjs): an in-memory
 * replica set, the real API process, a web build pointed at it, a static
 * server, Chromium, and the sign-in steps every gate starts with.
 */
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const FRONT = path.resolve(".");
export const BACK = path.resolve("../14-10-26-akbar-back");
export const SHOTS = path.join(FRONT, "docs/shots");
fs.mkdirSync(SHOTS, { recursive: true });

/** Waits for the element (isVisible() alone does not wait, so it races the data). */
export const shows = (locator, timeout = 15_000) =>
  locator
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);

export function checker() {
  let failures = 0;
  const check = (ok, msg) => {
    console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
    if (!ok) failures++;
  };
  return { check, failures: () => failures, fail: () => failures++ };
}

export async function startStack({ apiPort, admsPort }) {
  const backRequire = createRequire(path.join(BACK, "package.json"));
  const { MongoMemoryReplSet } = backRequire("mongodb-memory-server");
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  const env = {
    ...process.env,
    NODE_ENV: "development",
    MONGODB_URI: replSet.getUri("akbar_verify"),
    PORT: String(apiPort),
    ADMS_PORT: String(admsPort),
    JWT_ACCESS_SECRET: "verify-access-secret-not-used-anywhere-real",
    JWT_REFRESH_SECRET: "verify-refresh-secret-not-used-anywhere-real",
    CORS_ORIGIN: "",
    ADMS_FORWARD_URL: "",
    ADMS_AUTO_APPROVE: "false",
    BCRYPT_ROUNDS: "4",
  };
  const api = spawn(process.execPath, ["server.js"], { cwd: BACK, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  api.stdout.on("data", (d) => (log += d));
  api.stderr.on("data", (d) => (log += d));

  const end = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(`http://127.0.0.1:${apiPort}/health`)).ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > end) throw new Error(`API did not start:\n${log.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  /** Run a snippet inside the API project against the same database. */
  const backScript = (code) =>
    execFileSync(process.execPath, ["--input-type=module", "-e", code], { cwd: BACK, env }).toString();

  const ownerOut = execFileSync(process.execPath, ["scripts/createOwner.js", "--username", "akbar", "--name", "Akbar Sakharkar"], {
    cwd: BACK,
    env,
  }).toString();
  const ownerTemp = /Temporary password \(shown once\): (\S+)/.exec(ownerOut)?.[1];

  // the web build, pointed at this API; --clear because Metro caches inlined EXPO_PUBLIC_* values
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["expo", "export", "-p", "web", "--clear"], {
    cwd: FRONT,
    env: { ...process.env, EXPO_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}/api/v1` },
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  const DIST = path.join(FRONT, "dist");
  const web = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
    const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => web.listen(0, "127.0.0.1", r));
  const WEB = `http://127.0.0.1:${web.address().port}`;

  const browser = await chromium.launch();
  const diagnostics = [];
  const { DeviceSimulator } = await import(pathToFileURL(path.join(BACK, "scripts/deviceSimulator.mjs")).href);

  async function newPage(viewport = { width: 1440, height: 900 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      diagnostics.push(`console.${m.type()}: ${m.text().slice(0, 300)}`);
      // refused requests are sometimes the point of a check; the browser logs every 4xx as an error
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    page.on("response", (r) => r.status() >= 400 && diagnostics.push(`${r.status()} ${r.request().method()} ${r.url()}`));
    return { page, errors, ctx };
  }

  async function signIn(page, username, password, { parent = false } = {}) {
    await page.goto(`${WEB}/login`);
    await page.getByTestId("login-screen").waitFor();
    if (parent) await page.getByText("Parent", { exact: true }).click();
    await page.getByTestId("login-username").fill(username);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();
  }

  async function forcedChange(page, temp, next) {
    await page.getByTestId("forced-password-screen").waitFor();
    await page.getByTestId("cp-current").fill(temp);
    await page.getByTestId("cp-new").fill(next);
    await page.getByTestId("cp-confirm").fill(next);
    await page.getByTestId("cp-submit").click();
  }

  /** A custom Select: open it by its current text, pick the option by its label. */
  async function choose(page, openerText, optionText) {
    await page.getByText(openerText, { exact: true }).first().click();
    await page.getByText(optionText, { exact: true }).last().click();
  }

  async function stop() {
    await browser.close();
    web.close();
    api.kill();
    await replSet.stop();
  }

  return {
    WEB,
    env,
    ownerTemp,
    newPage,
    signIn,
    forcedChange,
    choose,
    backScript,
    DeviceSimulator,
    admsUrl: `http://127.0.0.1:${admsPort}`,
    diagnostics,
    apiLog: () => log,
    stop,
  };
}
