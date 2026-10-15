#!/usr/bin/env node
/**
 * Phase 3 gate in a real browser (docs/PHASES.md): the owner sets the academy
 * up, the front desk admits a student and hands over the slip, the machine
 * receives the student and sends the fingerprint back, a sibling joins the
 * family's login, and the parent signs in with the slip.
 *
 *   node tools/verifyAcademy.mjs
 */
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
console.log("Starting the stack (database, API, web build)…");
const s = await startStack({ apiPort: 5198, admsPort: 8298 });

try {
  // ---- the owner sets up the academy ---------------------------------------
  console.log("\nOwner — settings");
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();

  await P.getByRole("link", { name: "Settings" }).click();
  await P.getByTestId("settings-screen").waitFor();
  await P.getByText("Academic years", { exact: true }).click();
  await P.getByTestId("year-label").fill("2026-2027");
  check(await shows(P.locator('input[value="2026-04-01"]')), "typing 2026-2027 fills in April to March");
  await P.getByTestId("year-add").click();
  check(await shows(P.getByText("Year added.")), "academic year added — the first becomes current");

  await P.getByText("Standards", { exact: true }).click();
  await P.getByTestId("standard-new").click();
  await P.getByTestId("std-name").fill("Std. 10");
  await P.getByTestId("std-code").fill("10");
  await P.getByTestId("std-prefix").fill("10");
  await P.getByTestId("std-start").fill("501");
  check(await shows(P.getByText("The first new admission here gets GR 10501.", { exact: false })), "GR pattern previewed as the old system's 10501");
  await P.getByText("Add subject").click();
  await P.getByLabel("Subject 1").fill("Mathematics");
  await P.getByTestId("std-save").click();
  check(await shows(P.getByText("GR numbers 10501 onwards")), "standard saved with its GR numbering");
  await P.screenshot({ path: path.join(SHOTS, "academy-1-standards.png"), fullPage: true });

  await P.getByText("Academy & rules", { exact: true }).click();
  check(await shows(P.getByText("Lecture attendance from punches")), "the old system's four lecture parameters are on the rules page");
  await P.screenshot({ path: path.join(SHOTS, "academy-2-rules.png"), fullPage: true });

  console.log("\nOwner — batches, holidays, faculty, machine");
  await P.getByRole("link", { name: "Batches" }).click();
  await P.getByTestId("batch-new").click();
  await P.getByTestId("batch-name").fill("Std. 10 – B1");
  await s.choose(P, "Choose a standard", "Std. 10");
  await P.getByTestId("batch-save").click();
  check(await shows(P.getByTestId("batch-Std. 10 – B1")), "batch created, 3:30 to 6:30 pm, Monday to Saturday");

  await P.getByRole("link", { name: "Holidays" }).click();
  await P.getByTestId("holiday-date").fill("2026-11-08");
  await P.getByTestId("holiday-name").fill("Diwali");
  await P.getByTestId("holiday-add").click();
  check(await shows(P.getByText(/Diwali/).first()), "a holiday is on the calendar");

  await P.getByRole("link", { name: "Faculty", exact: true }).click();
  await P.getByTestId("teacher-new").click();
  await P.getByTestId("teacher-name").fill("Iliyas");
  await P.getByTestId("teacher-bio").fill("1");
  await P.getByTestId("teacher-save").click();
  check(await shows(P.getByTestId("teacher-1")), "a teacher keeps the old fingerprint ID 1");

  const sim = new s.DeviceSimulator({ baseUrl: s.admsUrl, serial: "RT502CHEETA", dialect: "v2" });
  await sim.handshake();
  await P.getByRole("link", { name: "Fingerprint machines" }).click();
  await P.getByTestId("device-RT502CHEETA").click();
  await P.getByTestId("device-approve").click();
  check(await shows(P.getByText("Approved. Held punches were processed.")), "the machine is approved");
  const desk = await createDesk(P);
  check(owner.errors.length === 0, `owner session: no console errors${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- the front desk admits a student --------------------------------------
  console.log("\nFront desk — admission");
  const deskPage = await s.newPage();
  const D = deskPage.page;
  await s.signIn(D, "desk1", desk);
  await s.forcedChange(D, desk, "Desk-One-Strong-77");
  await D.getByTestId("dashboard-screen").waitFor();
  await D.getByRole("link", { name: "Students" }).click();
  await D.getByTestId("students-admit").filter({ visible: true }).click();
  await D.getByTestId("admit-screen").waitFor();
  await s.choose(D, "Choose", "Std. 10");
  check(await shows(D.getByText(/GR number will be about 10501/)), "the form shows the GR the student will probably get");
  await s.choose(D, "Choose", "Std. 10 – B1");
  await D.getByTestId("admit-first").fill("Ayesha");
  await D.getByTestId("admit-last").fill("Khan");
  await D.getByTestId("admit-father").fill("Imran Khan");
  await D.getByTestId("admit-father-phone").fill("98199 36166");
  await D.screenshot({ path: path.join(SHOTS, "academy-3-admission-form.png"), fullPage: true });
  await D.getByTestId("admit-submit").filter({ visible: true }).click();
  await D.getByTestId("admission-slip").waitFor({ timeout: 20_000 });
  const gr = (await D.getByTestId("slip-gr-number").innerText()).trim();
  const bio = (await D.getByTestId("slip-fingerprint-id").innerText()).trim();
  const username = (await D.getByTestId("slip-parent-app-username").innerText()).trim();
  const temp = (await D.getByTestId("slip-temporary-password").innerText()).trim();
  check(gr === "10501" && bio === "2610501" && username === "P10501", `slip shows GR ${gr}, fingerprint ${bio}, parent ${username}`);
  check(/^[A-Za-z2-9]{10}$/.test(temp), "the slip carries the one-time parent password");
  check(await shows(D.getByTestId("slip-print")), "the slip can be printed");
  await D.screenshot({ path: path.join(SHOTS, "academy-4-slip.png"), fullPage: true });

  // ---- the machine receives the student and sends the fingerprint back -------
  console.log("\nThe machine");
  const cmds = await sim.poll();
  const add = cmds.find((c) => c.cmd.includes("PIN=2610501"));
  check(Boolean(add) && add.cmd.startsWith("DATA USER PIN=2610501\tName=Ayesha Khan"), "the machine is told to add Ayesha, in its own dialect");
  await sim.report(cmds.map((c) => ({ id: c.id, cmd: c.cmd, code: sim.execute(c) })));
  await sim.enrollFinger("2610501", 1);
  await D.getByText("Open student").click();
  await D.getByTestId("student-detail").waitFor();
  check(await shows(D.getByText("1 finger on file")), "the student's page shows the finger enrolled at the machine");
  await D.screenshot({ path: path.join(SHOTS, "academy-5-student.png"), fullPage: true });

  // ---- a sibling joins the family login --------------------------------------
  console.log("\nSibling");
  await D.getByText("All students").click();
  await D.getByTestId("students-admit").filter({ visible: true }).click();
  await s.choose(D, "Choose", "Std. 10");
  check(await shows(D.getByText(/GR number will be about 10502/)), "the GR preview moves on after an admission");
  await s.choose(D, "Choose", "Std. 10 – B1");
  await D.getByTestId("admit-first").fill("Zaid");
  await D.getByTestId("admit-last").fill("Khan");
  await D.getByTestId("admit-father-phone").fill("9819936166");
  check(await shows(D.getByText("This family may already have a login")), "the form notices the family already has a login");
  await D.getByTestId("link-P10501").locator('[role="switch"], input').first().click();
  await D.getByTestId("admit-submit").filter({ visible: true }).click();
  await D.getByTestId("admission-slip").waitFor({ timeout: 20_000 });
  check(await shows(D.getByText("Added to the family's existing parent login — no new password.")), "the sibling is added to P10501 with no new password");

  await D.getByText("Admit another").click();
  await D.setViewportSize({ width: 390, height: 844 });
  await D.waitForTimeout(500);
  const overflow = await D.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `admission form has no horizontal overflow at phone width (${overflow}px)`);
  await D.screenshot({ path: path.join(SHOTS, "academy-6-admission-phone.png"), fullPage: true });
  check(deskPage.errors.length === 0, `front-desk session: no console errors${deskPage.errors.length ? `: ${deskPage.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- the parent signs in with the slip -------------------------------------
  console.log("\nParent");
  const parent = await s.newPage({ width: 390, height: 844 });
  await s.signIn(parent.page, username, temp, { parent: true });
  await s.forcedChange(parent.page, temp, "Khan-Family-2026");
  await parent.page.getByTestId("parent-home").waitFor();
  const tab = (name) => parent.page.getByRole("tab", { name, exact: true });
  check((await shows(tab("Ayesha"))) && (await shows(tab("Zaid"))), "the parent sees both children on one login");
  await tab("Zaid").click();
  check(await shows(parent.page.getByText("Zaid Khan").first()), "…and switches between them");
  check(parent.errors.length === 0, "parent session: no console errors");
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 3 browser gate passed");
process.exit(failures() ? 1 : 0);

/** The owner creates the front-desk login used below; returns its temporary password. */
async function createDesk(P) {
  await P.getByRole("link", { name: "Staff logins" }).click();
  await P.getByTestId("users-new").click();
  await P.getByTestId("cu-name").fill("Front Desk One");
  await P.getByTestId("cu-username").fill("desk1");
  await P.getByText("Choose a role").click();
  await P.getByText("Front desk", { exact: true }).click();
  await P.getByTestId("cu-submit").click();
  await P.getByTestId("temporary-password").waitFor();
  return (await P.getByTestId("temporary-password-value").innerText()).trim();
}
