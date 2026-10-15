#!/usr/bin/env node
/**
 * Phase 5 gate in a real browser (docs/PHASES.md): a punch reaches the
 * parent app — today, the percentage, the calendar, the alert — and a leave
 * a parent applies for is approved by staff, changes nothing until then, and
 * comes back to the parent as an alert. The owner chooses what parents see.
 *
 * The batch's timing is set around the current time so "today" works whenever
 * this runs (it is not meant for the half hour around midnight).
 *
 *   node tools/verifyParent.mjs
 */
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
const IST = 330 * 60_000;
const istNow = new Date(Date.now() + IST);
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const ymd = (d) => d.toISOString().slice(0, 10);
const today = ymd(istNow);
const tomorrow = ymd(new Date(istNow.getTime() + 86_400_000));
const start = hhmm(new Date(istNow.getTime() - 20 * 60_000));
// late in the evening the window stops at 23:59 rather than wrapping past midnight
const end = istNow.getUTCHours() * 60 + istNow.getUTCMinutes() + 100 >= 24 * 60 ? "23:59" : hhmm(new Date(istNow.getTime() + 100 * 60_000));
const minusMin = (m) => hhmm(new Date(istNow.getTime() - m * 60_000));

console.log(`Starting the stack (batch ${start}–${end}, today ${today})…`);
const s = await startStack({ apiPort: 5198, admsPort: 8298 });

try {
  const seeded = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { studentService } from "./src/modules/student/student.service.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "${ymd(new Date(istNow.getTime() - 200 * 86_400_000))}", endDate: "${ymd(new Date(istNow.getTime() + 160 * 86_400_000))}" });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    const batch = await batchService.create({ name: "Std. 10 – B1", standardId: std._id, academicYearId: year._id, startTime: "${start}", endTime: "${end}", workingDays: ["sun","mon","tue","wed","thu","fri","sat"] });
    const out = [];
    for (const [first, last, phone] of [["Ayesha", "Khan", "9819936101"], ["Sara", "Patel", "9819936102"]]) {
      const r = await studentService.admit({ firstName: first, lastName: last, standardId: String(std._id), batchId: String(batch._id), admissionDate: "${ymd(new Date(istNow.getTime() - 30 * 86_400_000))}", guardians: [{ relation: "father", phone }] });
      out.push([r.student.biometricId, r.student._id, r.parentLogin.username, r.parentLogin.temporaryPassword].join(":"));
    }
    console.log("SEEDED " + out.join(" "));
    await mongoose.disconnect();
  `);
  const [ayesha] = /SEEDED (.*)/.exec(seeded)[1].split(" ").map((x) => {
    const [bio, id, username, temp] = x.split(":");
    return { bio, id, username, temp };
  });

  const sim = new s.DeviceSimulator({ baseUrl: s.admsUrl, serial: "RT502CHEETA", dialect: "v2" });
  await sim.handshake();
  s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { DeviceModel } from "./src/modules/device/device.model.js";
    import { admsService } from "./src/modules/adms/adms.service.js";
    await connectDb();
    await admsService.approveDevice((await DeviceModel.findOne({ serial: "RT502CHEETA" }).lean())._id);
    await mongoose.disconnect();
  `);
  // Ayesha reaches class ten minutes ago, and presses twice
  await sim.punch([{ pin: ayesha.bio, time: `${today} ${minusMin(10)}:00` }]);
  await sim.punch([{ pin: ayesha.bio, time: `${today} ${minusMin(10)}:00` }]);

  // ---- the parent app ----------------------------------------------------------
  console.log("\nParent app");
  const parent = await s.newPage({ width: 390, height: 844 });
  const Q = parent.page;
  await s.signIn(Q, ayesha.username, ayesha.temp, { parent: true });
  await s.forcedChange(Q, ayesha.temp, "Family-Strong-2026");
  await Q.getByTestId("parent-home").waitFor();
  check(await shows(Q.getByText("Ayesha Khan").first()), "the parent sees their child by name");
  check(await shows(Q.getByTestId("parent-today-headline").getByText(/^In class since/)), "today says she is in class, with the time");
  check(await shows(Q.getByTestId("parent-punches")), "the punch times are shown (the owner allows it)");
  check(await shows(Q.getByTestId("parent-percent-month")), "this month's percentage is shown");
  await Q.screenshot({ path: path.join(SHOTS, "parent-1-home.png"), fullPage: true });

  await Q.getByTestId("tab-alerts").click();
  await Q.getByTestId("parent-alerts").waitFor();
  const entryAlerts = Q.getByText(/^Dear Parents, Ayesha \(10501\) has reached our class at/);
  check(await shows(entryAlerts.first()), "the alert is in the old system's words");
  check((await entryAlerts.count()) === 1, `one alert for the punch, though the machine sent it twice (${await entryAlerts.count()})`);
  await Q.getByTestId("alerts-read-all").click();
  const cleared = await Q.getByTestId("alerts-read-all")
    .waitFor({ state: "hidden", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  check(cleared, "mark all read clears the new count");
  await Q.screenshot({ path: path.join(SHOTS, "parent-2-alerts.png"), fullPage: true });

  await Q.getByTestId("tab-calendar").click();
  await Q.getByTestId("parent-calendar").waitFor();
  check(await shows(Q.getByTestId(`day-${today}-present`)), "today is green on the calendar");
  await Q.getByTestId(`day-${today}-present`).click();
  check(await shows(Q.getByTestId("calendar-day").getByText(/^Reached/)), "tapping the day shows when she reached");
  await Q.screenshot({ path: path.join(SHOTS, "parent-3-calendar.png"), fullPage: true });

  await Q.getByTestId("tab-more").click();
  await Q.getByTestId("parent-more").waitFor();
  await Q.getByText("Apply for leave", { exact: true }).click();
  await Q.getByTestId("parent-leave").waitFor();
  await Q.getByTestId("leave-from").fill(tomorrow);
  await Q.getByTestId("leave-reason").fill("Family function");
  await Q.getByTestId("leave-submit").click();
  check(await shows(Q.getByText(/^Sent\. The academy will approve it/)), "a leave application is sent");
  check(await shows(Q.getByTestId("leave-row-pending")), "…and waits for the academy");
  await Q.screenshot({ path: path.join(SHOTS, "parent-4-leave.png"), fullPage: true });

  await Q.getByTestId("tab-account").click();
  await Q.getByTestId("parent-account").waitFor();
  const exitSwitch = () => Q.getByRole("switch", { name: "leaves class" });
  await exitSwitch().click();
  await Q.waitForTimeout(800);
  await Q.reload();
  await Q.getByTestId("parent-account").waitFor();
  check(!(await exitSwitch().isChecked()), "turning off 'leaves class' alerts is kept after a reload");
  check(await Q.getByRole("switch", { name: "reaches class" }).isChecked(), "…and 'reaches class' stays on");
  const overflow = await Q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `the parent app has no horizontal overflow on a phone (${overflow}px)`);

  // ---- the academy's side ----------------------------------------------------------
  console.log("\nStaff");
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();
  check(await shows(P.getByTestId("tile-leaves").getByText("1", { exact: true })), "the dashboard shows 1 leave to decide");
  check(await shows(P.getByTestId("tile-reach")), "…and how many families get app alerts");

  await P.getByRole("link", { name: "Leave requests" }).click();
  await P.getByTestId("leave-requests").waitFor();
  check(await shows(P.getByText("Ayesha Khan · GR 10501")), "the request names the student and GR");
  await P.screenshot({ path: path.join(SHOTS, "parent-5-staff-leave.png"), fullPage: true });
  await P.getByTestId("leave-approve").click();
  check(await shows(P.getByText("Nothing waiting")), "approved: nothing left waiting");

  await P.getByRole("link", { name: "Parent alerts" }).click();
  await P.getByTestId("alert-log").waitFor();
  check(await shows(P.getByText(/has reached our class/).first()), "staff see the alert that went to the family");
  check(await shows(P.getByText("Families without the app get nothing")), "…and are warned that there is no SMS fallback set");
  await P.screenshot({ path: path.join(SHOTS, "parent-6-alert-log.png"), fullPage: true });

  await P.getByRole("link", { name: "Settings" }).click();
  await P.getByTestId("settings-screen").waitFor();
  await P.getByText("Parent app & alerts", { exact: true }).click();
  check(await shows(P.getByText(/^Dear Parents, Ayesha \(10501\) has reached our class at 4:02 pm/)), "the alert wording is previewed");
  await P.getByTestId("parentapp-leave").click();
  await P.getByTestId("parentapp-save").click();
  check(await shows(P.getByText("Saved. The next alert uses it.")), "the owner closes leave applications in the app");
  check(owner.errors.length === 0, `no console errors for staff${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- back to the parent ---------------------------------------------------------
  console.log("\nParent, after");
  await Q.goto(`${s.WEB}/parent/alerts`);
  await Q.getByTestId("parent-alerts").waitFor();
  check(await shows(Q.getByText("Ayesha: leave approved")), "the parent is told the leave was approved");
  await Q.goto(`${s.WEB}/parent/more`);
  await Q.getByTestId("parent-more").waitFor();
  check(await shows(Q.getByText("Notice board", { exact: true })), "More lists the sections the owner allows");
  // the sections appear once the owner's settings are in; test results is on, leave is off
  await shows(Q.getByText("Marks, rank and class average", { exact: true }));
  check(!(await Q.getByText("Apply for leave", { exact: true }).count()), "Leave is gone from More once the owner closed applications");
  check(parent.errors.length === 0, `no console errors for the parent${parent.errors.length ? `: ${parent.errors.slice(0, 2).join(" | ")}` : ""}`);
  await Q.screenshot({ path: path.join(SHOTS, "parent-7-approved.png"), fullPage: true });
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 5 browser gate passed");
process.exit(failures() ? 1 : 0);
