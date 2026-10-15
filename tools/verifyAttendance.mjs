#!/usr/bin/env node
/**
 * Phase 4 gate in a real browser (docs/PHASES.md): punches from the simulated
 * machine become the live board, the registers, lecture marks and a
 * student's percentage; a missed punch is corrected on the register.
 *
 * The batch's timing is set around the current time so "today" works whenever
 * this runs (it is not meant for the half hour around midnight).
 *
 *   node tools/verifyAttendance.mjs
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
const yesterday = ymd(new Date(istNow.getTime() - 86_400_000));
const start = hhmm(new Date(istNow.getTime() - 20 * 60_000));
// late in the evening the window stops at 23:59 rather than wrapping past midnight
const end = istNow.getUTCHours() * 60 + istNow.getUTCMinutes() + 100 >= 24 * 60 ? "23:59" : hhmm(new Date(istNow.getTime() + 100 * 60_000));
const minusMin = (m) => hhmm(new Date(istNow.getTime() - m * 60_000));

console.log(`Starting the stack (batch ${start}–${end}, today ${today})…`);
const s = await startStack({ apiPort: 5197, admsPort: 8297 });

try {
  const seeded = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { studentService } from "./src/modules/student/student.service.js";
    import { LectureSessionModel } from "./src/modules/lecture/lecture-session.model.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "${ymd(new Date(istNow.getTime() - 200 * 86_400_000))}", endDate: "${ymd(new Date(istNow.getTime() + 160 * 86_400_000))}" });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    const batch = await batchService.create({ name: "Std. 10 – B1", standardId: std._id, academicYearId: year._id, startTime: "${start}", endTime: "${end}", workingDays: ["sun","mon","tue","wed","thu","fri","sat"] });
    const out = [];
    for (const [first, last] of [["Ayesha", "Khan"], ["Zaid", "Shaikh"], ["Sara", "Patel"]]) {
      const r = await studentService.admit({ firstName: first, lastName: last, standardId: String(std._id), batchId: String(batch._id), admissionDate: "${ymd(new Date(istNow.getTime() - 30 * 86_400_000))}", guardians: [{ relation: "father", phone: "98199361" + String(out.length).padStart(2, "0") }] });
      out.push(r.student.biometricId + ":" + r.student._id);
    }
    await LectureSessionModel.create({ batchId: batch._id, date: "${today}", startTime: "${start}", endTime: "${end}", subject: "Maths" });
    console.log("SEEDED " + out.join(" "));
    await mongoose.disconnect();
  `);
  const [ayesha, zaid, sara] = /SEEDED (.*)/.exec(seeded)[1].split(" ").map((x) => {
    const [bio, id] = x.split(":");
    return { bio, id };
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

  // the evening's punches: Ayesha arrives today; Zaid came yesterday, Sara did not;
  // someone enrolled on the machine but never admitted here punches too
  await sim.punch([{ pin: ayesha.bio, time: `${today} ${minusMin(10)}:00` }]);
  await sim.punch([{ pin: zaid.bio, time: `${yesterday} ${start}:00` }]);
  await sim.punch([{ pin: "2619999", time: `${today} ${minusMin(5)}:00` }]);
  // yesterday is closed, as the scheduler would have done last night
  s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { closeDays } from "./src/modules/attendance/attendance.engine.js";
    await connectDb();
    await closeDays(new Date(), { daysBack: 1 });
    await mongoose.disconnect();
  `);

  // ---- the live board ---------------------------------------------------------
  console.log("\nToday");
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();
  check(await shows(P.getByTestId("tile-present").getByText("1", { exact: true })), "the dashboard shows 1 in class today");

  await P.getByRole("link", { name: "Today" }).click();
  await P.getByTestId("board-screen").waitFor();
  const card = P.getByTestId("board-Std. 10 – B1");
  check(await shows(card.getByLabel("In 1")), "the batch shows 1 in");
  check(await shows(card.getByLabel("Not yet 2")), "…and 2 not in yet");
  check(await shows(P.getByText("Ayesha Khan · 10501")), "Ayesha's punch is in the latest punches with her name and GR");
  check(await shows(P.getByText("Unknown ID 2619999")), "a punch from an ID nobody has is shown as unknown");
  check(await shows(P.getByText("1 punch from an ID nobody has")), "…with a banner saying what to do about it");
  await P.screenshot({ path: path.join(SHOTS, "attendance-1-board.png"), fullPage: true });

  // a new punch appears without anyone clicking
  await sim.punch([{ pin: sara.bio, time: `${today} ${minusMin(2)}:00` }]);
  check(await shows(P.getByText("Sara Patel · 10503"), 20_000), "a punch appears on the board on its own within seconds");

  // ---- yesterday's register, and a correction ----------------------------------
  console.log("\nRegisters");
  await card.click();
  await P.getByTestId("register-screen").waitFor();
  await P.getByLabel("Previous day").click();
  check(await shows(P.getByLabel("Zaid Shaikh, present")), "yesterday: Zaid present from his punch");
  check(await shows(P.getByLabel("Sara Patel, absent")), "yesterday: Sara absent — the day was closed");
  await P.screenshot({ path: path.join(SHOTS, "attendance-2-register.png"), fullPage: true });

  await P.getByLabel("Sara Patel, absent").click();
  await P.getByTestId("correction-panel").waitFor();
  await P.getByTestId("correction-time").fill(start);
  await P.getByTestId("correction-reason").fill("Machine missed her, teacher confirms");
  await P.getByTestId("correction-save").click();
  check(await shows(P.getByLabel("Sara Patel, present"), 20_000), "a missed punch added by hand turns her absence into present");

  // ---- the lecture register ---------------------------------------------------------
  console.log("\nLecture");
  await P.getByLabel("Next day").click();
  await P.getByTestId(`lecture-${start}`).click();
  await P.getByTestId("lecture-register").waitFor();
  check(await shows(P.getByText(/punched/).first()), "the lecture is marked from punches");
  await P.getByTestId("mark-10502-present").click();
  await P.getByTestId("lecture-save").click();
  check(await shows(P.getByText("Saved. These marks are now fixed by hand.")), "a lecture mark corrected by hand is saved");
  check(await shows(P.getByText(/set by hand/).first()), "…and shown as set by hand");
  await P.screenshot({ path: path.join(SHOTS, "attendance-3-lecture.png"), fullPage: true });

  // ---- the student's percentage, and unknown IDs ------------------------------------------
  console.log("\nStudent and punches");
  await P.goto(`${s.WEB}/students/${zaid.id}`);
  await P.getByTestId("student-detail").waitFor();
  check(await shows(P.getByTestId("student-percent")), "the student page shows the attendance percentage");
  await P.screenshot({ path: path.join(SHOTS, "attendance-4-student.png"), fullPage: true });

  await P.getByRole("link", { name: "Punches" }).click();
  await P.getByTestId("punches-screen").waitFor();
  await P.getByText("Unknown IDs", { exact: true }).click();
  check(await shows(P.getByText("2619999")), "the punches list filters to unknown IDs");
  check(owner.errors.length === 0, `no console errors${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  // ---- phone width ---------------------------------------------------------------------
  await P.setViewportSize({ width: 390, height: 844 });
  await P.goto(`${s.WEB}/today`);
  await P.getByTestId("board-screen").waitFor();
  await P.waitForTimeout(800);
  const overflow = await P.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `the board has no horizontal overflow on a phone (${overflow}px)`);
  await P.screenshot({ path: path.join(SHOTS, "attendance-5-board-phone.png"), fullPage: true });
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 4 browser gate passed");
process.exit(failures() ? 1 : 0);
