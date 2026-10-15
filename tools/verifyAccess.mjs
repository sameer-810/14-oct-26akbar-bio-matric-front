#!/usr/bin/env node
/**
 * Phase 2 gate in a real browser, against the real API on an in-memory
 * replica set (docs/PHASES.md):
 *
 *   owner signs in with the temporary password → forced change → dashboard
 *   owner creates a front-desk login → temporary password shown once
 *   a machine connects → pending → owner approves it → audit trail shows it
 *   front desk signs in → forced change → dashboard from their role:
 *     machines yes, staff logins and audit no, and a deep link to /staff renders nothing
 *   a parent signs in on the parent door → forced change → parent home
 *
 *   node tools/verifyAccess.mjs            (builds the web export itself)
 */
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const FRONT = path.resolve(".");
const BACK = path.resolve("../14-10-26-akbar-back");
const SHOTS = path.join(FRONT, "docs/shots");
const API_PORT = 5199;
const ADMS_PORT = 8299;
fs.mkdirSync(SHOTS, { recursive: true });

const backRequire = createRequire(path.join(BACK, "package.json"));
const { MongoMemoryReplSet } = backRequire("mongodb-memory-server");

/** Waits for the element (isVisible() alone does not wait, so it races the data). */
const shows = (locator, timeout = 15_000) =>
  locator
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
  if (!ok) failures++;
};

// ---- API on an in-memory replica set ---------------------------------------
console.log("Starting MongoDB and the API…");
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
const env = {
  ...process.env,
  NODE_ENV: "development",
  MONGODB_URI: replSet.getUri("akbar_verify"),
  PORT: String(API_PORT),
  ADMS_PORT: String(ADMS_PORT),
  JWT_ACCESS_SECRET: "verify-access-secret-not-used-anywhere-real",
  JWT_REFRESH_SECRET: "verify-refresh-secret-not-used-anywhere-real",
  CORS_ORIGIN: "",
  ADMS_FORWARD_URL: "",
  ADMS_AUTO_APPROVE: "false",
  BCRYPT_ROUNDS: "4",
};
const api = spawn(process.execPath, ["server.js"], { cwd: BACK, env, stdio: ["ignore", "pipe", "pipe"] });
let apiLog = "";
api.stdout.on("data", (d) => (apiLog += d));
api.stderr.on("data", (d) => (apiLog += d));

async function waitFor(url, ms = 30_000) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > end) throw new Error(`${url} did not come up:\n${apiLog.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

let browser;
let staticServer;
const diagnostics = [];
try {
  await waitFor(`http://127.0.0.1:${API_PORT}/health`);

  const ownerOut = execFileSync(process.execPath, ["scripts/createOwner.js", "--username", "akbar", "--name", "Akbar Sakharkar"], {
    cwd: BACK,
    env,
  }).toString();
  const ownerTemp = /Temporary password \(shown once\): (\S+)/.exec(ownerOut)?.[1];
  check(Boolean(ownerTemp), "owner created by the script with a one-time password");

  // a parent login exists only through an admission, and only works while a child is active
  const parentOut = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import mongoose from "mongoose";
       import { connectDb } from "./src/config/db.js";
       import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
       import { standardService } from "./src/modules/standard/standard.service.js";
       import { batchService } from "./src/modules/batch/batch.service.js";
       import { studentService } from "./src/modules/student/student.service.js";
       await connectDb();
       const year = await academicYearService.create({ label: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" });
       const std = await standardService.create({ name: "Std. 12 (COM)", code: "12COM", grPrefix: "12", grStartAt: 12 });
       const batch = await batchService.create({ name: "Std. 12 (COM) – B1", standardId: std._id, academicYearId: year._id, startTime: "17:00", endTime: "19:00" });
       const r = await studentService.admit({ firstName: "Furkan", lastName: "Shaikh", standardId: String(std._id), batchId: String(batch._id), guardians: [{ relation: "father", name: "Imran Shaikh", phone: "9820011111" }] });
       console.log("PARENT " + r.parentLogin.username + " " + r.parentLogin.temporaryPassword);
       await mongoose.disconnect();`,
    ],
    { cwd: BACK, env },
  ).toString();
  const [, parentUser, parentTemp] = /PARENT (\S+) (\S+)/.exec(parentOut) ?? [];

  // ---- the web build, pointed at this API -----------------------------------
  console.log("Building the web export…");
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["expo", "export", "-p", "web", "--clear"], {
    cwd: FRONT,
    env: { ...process.env, EXPO_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}/api/v1` },
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  const DIST = path.join(FRONT, "dist");
  staticServer = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
    const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => staticServer.listen(0, "127.0.0.1", r));
  const WEB = `http://127.0.0.1:${staticServer.address().port}`;

  browser = await chromium.launch();

  async function newPage(viewport = { width: 1440, height: 900 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // refused sign-ins are expected here; the browser logs every 4xx as an error
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    page.on("requestfailed", (r) => diagnostics.push(`request failed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on("response", (r) => r.status() >= 400 && diagnostics.push(`${r.status()} ${r.request().method()} ${r.url()}`));
    page.on("console", (m) => diagnostics.push(`console.${m.type()}: ${m.text().slice(0, 300)}`));
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

  // ---- 1. owner: first sign-in --------------------------------------------
  console.log("\nOwner");
  const owner = await newPage();
  await signIn(owner.page, "akbar", "wrong-password-1");
  check(await shows(owner.page.getByText("Username or password is incorrect")), "a wrong password is refused with a plain message");
  await owner.page.screenshot({ path: path.join(SHOTS, "access-1-login.png") });
  await signIn(owner.page, "akbar", ownerTemp);
  await owner.page.getByTestId("forced-password-screen").waitFor();
  check(true, "the temporary password leads to the forced change, nothing else");
  await owner.page.screenshot({ path: path.join(SHOTS, "access-2-forced-change.png") });
  await forcedChange(owner.page, ownerTemp, "Akbars-Owner-2026");
  await owner.page.getByTestId("dashboard-screen").waitFor();
  check(await shows(owner.page.getByText("Hello, Akbar")), "owner lands on the dashboard");
  for (const label of ["Fingerprint machines", "Staff logins", "Audit trail"]) {
    check(await shows(owner.page.getByRole("link", { name: label })), `owner's sidebar has "${label}"`);
  }

  // ---- 2. owner creates a front-desk login --------------------------------
  await owner.page.getByRole("link", { name: "Staff logins" }).click();
  await owner.page.getByTestId("users-screen").waitFor();
  await owner.page.getByTestId("users-new").click();
  await owner.page.getByTestId("cu-name").fill("Front Desk One");
  await owner.page.getByTestId("cu-username").fill("desk1");
  await owner.page.getByTestId("cu-phone").fill("+91 98199 36166");
  await owner.page.getByText("Choose a role").click();
  await owner.page.getByText("Front desk", { exact: true }).click();
  await owner.page.getByTestId("cu-submit").click();
  await owner.page.getByTestId("temporary-password").waitFor();
  const deskTemp = (await owner.page.getByTestId("temporary-password-value").innerText()).trim();
  check(/^[A-Za-z2-9]{10}$/.test(deskTemp), "the new login's temporary password is shown once");
  await owner.page.screenshot({ path: path.join(SHOTS, "access-3-login-created.png") });

  // ---- 3. a machine connects; the owner approves it ------------------------
  const { DeviceSimulator } = await import(pathToFileURL(path.join(BACK, "scripts/deviceSimulator.mjs")).href);
  const sim = new DeviceSimulator({ baseUrl: `http://127.0.0.1:${ADMS_PORT}`, serial: "RT502CHEETA", dialect: "v2" });
  await sim.handshake();
  await sim.punch([{ pin: "2612012" }]);

  await owner.page.getByRole("link", { name: "Fingerprint machines" }).click();
  await owner.page.getByTestId("devices-screen").waitFor();
  check(await shows(owner.page.getByText("1 machine waiting for approval")), "a new machine shows as waiting for approval");
  await owner.page.getByTestId("device-RT502CHEETA").click();
  await owner.page.getByTestId("device-detail").waitFor();
  await owner.page.screenshot({ path: path.join(SHOTS, "access-4-device-pending.png"), fullPage: true });
  await owner.page.getByTestId("device-approve").click();
  check(await shows(owner.page.getByText("Approved. Held punches were processed.")), "approving processes the held punches");
  check(await shows(owner.page.getByText("Punches received")), "machine facts shown");
  await owner.page.screenshot({ path: path.join(SHOTS, "access-5-device-approved.png"), fullPage: true });

  await owner.page.getByRole("link", { name: "Audit trail" }).click();
  await owner.page.getByTestId("audit-screen").waitFor();
  check(await shows(owner.page.getByText(/device\.approved/).first()), "the approval is in the audit trail");
  check(await shows(owner.page.getByText(/user\.created/).first()), "the login creation is in the audit trail");
  await owner.page.screenshot({ path: path.join(SHOTS, "access-6-audit.png") });
  check(owner.errors.length === 0, `owner session: no console errors${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- 4. front desk: forced change, role-shaped app -----------------------
  console.log("\nFront desk (phone width)");
  const desk = await newPage({ width: 390, height: 844 });
  await signIn(desk.page, "desk1", deskTemp);
  await forcedChange(desk.page, deskTemp, "Desk-One-Strong-77");
  await desk.page.getByTestId("dashboard-screen").waitFor();
  check(await shows(desk.page.getByText("Machines online")), "front desk sees the machine tiles");
  await desk.page.screenshot({ path: path.join(SHOTS, "access-7-desk-phone.png") });
  await desk.page.getByRole("button", { name: "Open menu" }).click();
  check(await shows(desk.page.getByRole("link", { name: "Fingerprint machines" })), "front desk menu has machines");
  check(!(await desk.page.getByRole("link", { name: "Staff logins" }).count()), "front desk menu has no staff logins");
  check(!(await desk.page.getByRole("link", { name: "Audit trail" }).count()), "front desk menu has no audit trail");
  await desk.page.goto(`${WEB}/staff`);
  await desk.page.waitForTimeout(1500);
  check(!(await desk.page.getByTestId("users-screen").count()), "a deep link to /staff renders nothing for front desk");
  const overflow = await desk.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `no horizontal overflow at phone width (${overflow}px)`);
  check(desk.errors.length === 0, `front-desk session: no console errors${desk.errors.length ? `: ${desk.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- 5. a parent on the parent door ---------------------------------------
  console.log("\nParent (phone width)");
  const parent = await newPage({ width: 390, height: 844 });
  await signIn(parent.page, "akbar", "Akbars-Owner-2026", { parent: true });
  check(await shows(parent.page.getByText("Username or password is incorrect")), "a staff login does not open the parent door");
  await signIn(parent.page, parentUser.toUpperCase(), parentTemp, { parent: true });
  await forcedChange(parent.page, parentTemp, "Shaikh-Family-2026");
  await parent.page.getByTestId("parent-home").waitFor();
  await parent.page.screenshot({ path: path.join(SHOTS, "access-8-parent-home.png"), fullPage: true });
  await parent.page.getByTestId("tab-account").click();
  check(await shows(parent.page.getByText(`Login ${parentUser.toUpperCase()}`)), `parent ${parentUser.toUpperCase()} lands in the parent app as themselves`);
  await parent.page.goto(`${WEB}/devices`);
  await parent.page.waitForTimeout(1500);
  check(!(await parent.page.getByTestId("devices-screen").count()), "a parent cannot reach staff screens by URL");
  check(parent.errors.length === 0, `parent session: no console errors${parent.errors.length ? `: ${parent.errors.slice(0, 2).join(" | ")}` : ""}`);
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + diagnostics.slice(-25).join("\n"));
  console.error("\n--- API log (tail) ---\n" + apiLog.slice(-1500));
  failures++;
} finally {
  await browser?.close();
  staticServer?.close();
  api.kill();
  await replSet.stop();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nPhase 2 browser gate passed");
process.exit(failures ? 1 : 0);
