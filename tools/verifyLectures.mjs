#!/usr/bin/env node
/**
 * Phase 6 gate in a real browser (docs/PHASES.md): lectures judged from the
 * teacher's punches, one confirmed by the office, a timetable planned for a
 * week, the faculty page with a pay rate, the salary report, and a teacher's
 * own login cancelling their own lecture (the family is told).
 *
 *   node tools/verifyLectures.mjs
 */
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
const IST = 330 * 60_000;
const istNow = new Date(Date.now() + IST);
const ymd = (d) => d.toISOString().slice(0, 10);
const day = (n) => ymd(new Date(istNow.getTime() + n * 86_400_000));
const today = day(0);
const yesterday = day(-1);
const tomorrow = day(1);
const lastMonth = yesterday.slice(0, 7) !== today.slice(0, 7);

console.log(`Starting the stack (today ${today})…`);
const s = await startStack({ apiPort: 5199, admsPort: 8299 });

try {
  s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { studentService } from "./src/modules/student/student.service.js";
    import { teacherService } from "./src/modules/teacher/teacher.service.js";
    import { lectureService } from "./src/modules/lecture/lecture.service.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "${day(-200)}", endDate: "${day(160)}" });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    const batch = await batchService.create({ name: "Std. 10 – B1", standardId: std._id, academicYearId: year._id, startTime: "15:00", endTime: "21:00", workingDays: ["sun","mon","tue","wed","thu","fri","sat"] });
    await studentService.admit({ firstName: "Ayesha", lastName: "Khan", standardId: String(std._id), batchId: String(batch._id), admissionDate: "${day(-30)}", guardians: [{ relation: "father", phone: "9819936166" }] });
    await teacherService.create({ title: "Mr.", name: "Iliyas", subjects: ["Maths"], biometricId: "1" });
    const sana = await teacherService.create({ title: "Ms.", name: "Sana", subjects: ["Physics"], biometricId: "2" });
    const by = { userId: null };
    await lectureService.create({ batchId: String(batch._id), date: "${yesterday}", startTime: "16:00", endTime: "17:00", subject: "Physics", teacherId: String(sana._id) }, by);
    await lectureService.create({ batchId: String(batch._id), date: "${yesterday}", startTime: "19:00", endTime: "20:00", subject: "Physics", teacherId: String(sana._id) }, by);
    await lectureService.create({ batchId: String(batch._id), date: "${tomorrow}", startTime: "18:00", endTime: "19:00", subject: "Physics", teacherId: String(sana._id) }, by);
    await mongoose.disconnect();
  `);

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
  // Sana came in at 16:10 yesterday and left at 17:30, before her 19:00 lecture
  await sim.punch([{ pin: "2", time: `${yesterday} 16:10:00` }]);
  await sim.punch([{ pin: "2", time: `${yesterday} 17:30:00` }]);

  // ---- the office ------------------------------------------------------------------
  console.log("\nLectures");
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();
  check(await shows(P.getByTestId("tile-lectures")), "the dashboard counts today's lectures");

  await P.getByRole("link", { name: "Lectures" }).click();
  await P.getByTestId("lectures-screen").waitFor();
  await P.getByLabel("Previous day").click();
  const first = P.getByTestId("lecture-card-16:00");
  const second = P.getByTestId("lecture-card-19:00");
  check(await shows(first.getByText("conducted")), "the 4 pm lecture is conducted — Sana's punch shows her in");
  check(await shows(first.getByText("Teacher in, 10 min late")), "…and she was 10 minutes late, from her punch");
  check(await shows(second.getByText("to confirm")), "the 7 pm lecture needs confirming — she had punched out");
  check(await shows(P.getByText("1 lecture to confirm")), "…with a banner explaining why it matters");
  await P.screenshot({ path: path.join(SHOTS, "lectures-1-day.png"), fullPage: true });
  await second.getByTestId("lecture-confirm").click();
  check(await shows(second.getByText("conducted")), "the office confirms it was taken");

  console.log("\nPlan");
  await P.getByTestId("lectures-plan").click();
  await P.getByTestId("plan-screen").waitFor();
  await s.choose(P, "Choose a batch", "Std. 10 – B1");
  await P.getByTestId("plan-from").fill(tomorrow);
  await P.getByTestId("plan-to").fill(day(7));
  for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) await P.getByRole("checkbox", { name: d }).click();
  await P.getByTestId("plan-start-0").fill("16:00");
  await P.getByTestId("plan-end-0").fill("17:00");
  await P.getByTestId("plan-subject-0").fill("Maths");
  await s.choose(P, "Choose the teacher", "Mr. Iliyas");
  await P.getByTestId("plan-submit").click();
  check(await shows(P.getByTestId("plan-result").getByText("7 lectures created")), "a week of lectures is planned in one go");
  await P.screenshot({ path: path.join(SHOTS, "lectures-2-plan.png"), fullPage: true });
  await P.getByTestId("plan-submit").click();
  check(await shows(P.getByText("0 lectures created, 7 skipped")), "planning it again doubles nothing");
  check(await shows(P.getByText(/— already there/).first()), "…and says why each was skipped");

  await P.goto(`${s.WEB}/lectures`);
  await P.getByTestId("lectures-screen").waitFor();
  await P.getByText("Month", { exact: true }).click();
  if (tomorrow.slice(0, 7) !== today.slice(0, 7)) await P.getByLabel("Next month").click();
  check(await shows(P.getByLabel(`${tomorrow}: 2 lectures`)), "the month shows tomorrow's two lectures");
  await P.screenshot({ path: path.join(SHOTS, "lectures-3-month.png"), fullPage: true });

  console.log("\nFaculty and pay");
  await P.getByRole("link", { name: "Faculty", exact: true }).click();
  await P.getByTestId("teacher-2").click();
  await P.getByTestId("teacher-detail").waitFor();
  if (lastMonth) await P.getByText("‹", { exact: true }).click();
  await P.getByTestId("rate-new").click();
  await P.getByTestId("rate-amount").fill("300");
  await P.getByLabel("From").fill(`${yesterday.slice(0, 7)}-01`);
  await P.getByTestId("rate-save").click();
  check(await shows(P.getByTestId("month-pay-amount").getByText("₹600")), "two lectures taken at ₹300 each: ₹600");
  await P.screenshot({ path: path.join(SHOTS, "lectures-4-faculty.png"), fullPage: true });

  await P.getByRole("link", { name: "Faculty salary" }).click();
  await P.getByTestId("salary-screen").waitFor();
  if (lastMonth) await P.getByText("‹ Previous", { exact: true }).click();
  check(await shows(P.getByTestId("salary-total").getByText("₹600")), "the salary report totals the month");
  check(await shows(P.getByText("Teachers with no rate")), "…and points at teachers with no rate");
  await P.screenshot({ path: path.join(SHOTS, "lectures-5-salary.png"), fullPage: true });

  console.log("\nTeacher login");
  await P.getByRole("link", { name: "Staff logins" }).click();
  await P.getByTestId("users-new").click();
  await P.getByTestId("cu-name").fill("Sana");
  await P.getByTestId("cu-username").fill("sana");
  await s.choose(P, "Choose a role", "Teacher");
  await s.choose(P, "Choose who this login is for", "Ms. Sana");
  await P.getByTestId("cu-submit").click();
  await P.getByTestId("temporary-password").waitFor();
  const temp = (await P.getByTestId("temporary-password-value").innerText()).trim();
  check(owner.errors.length === 0, `no console errors for the office${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  const teacher = await s.newPage({ width: 390, height: 844 });
  const T = teacher.page;
  await s.signIn(T, "sana", temp);
  await s.forcedChange(T, temp, "Sana-Teaches-2026");
  await T.getByTestId("dashboard-screen").waitFor();
  await T.getByLabel("Open menu").click();
  await T.getByRole("link", { name: "My teaching" }).click();
  await T.getByTestId("my-teaching").waitFor();
  const mine = T.getByTestId("lecture-card-18:00");
  check(await shows(mine), "the teacher sees her own lecture tomorrow");
  if (!lastMonth) check(await shows(T.getByTestId("month-pay-amount").getByText("₹600")), "…and her pay this month");
  await mine.getByTestId("lecture-cancel").click();
  await mine.getByTestId("cancel-reason").fill("Exam duty at college");
  await mine.getByTestId("cancel-confirm").click();
  check(await shows(mine.getByText("Cancelled", { exact: true })), "she cancels her own lecture with a reason");
  const told = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { NotificationModel } from "./src/modules/notification/notification.model.js";
    await connectDb();
    console.log("TOLD " + (await NotificationModel.countDocuments({ type: "notice", body: /is cancelled\\. Exam duty at college/ })));
    await mongoose.disconnect();
  `);
  check(/TOLD 1/.test(told), "the family is told, once");
  const overflow = await T.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `the teacher's view has no horizontal overflow on a phone (${overflow}px)`);
  check(teacher.errors.length === 0, `no console errors for the teacher${teacher.errors.length ? `: ${teacher.errors.slice(0, 2).join(" | ")}` : ""}`);
  await T.screenshot({ path: path.join(SHOTS, "lectures-6-teacher.png"), fullPage: true });
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 6 browser gate passed");
process.exit(failures() ? 1 : 0);
