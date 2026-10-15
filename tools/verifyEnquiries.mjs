#!/usr/bin/env node
/**
 * Phase 8 gate in a real browser (docs/PHASES.md): a counselor enters a
 * lead with a follow-up and sees it on the week's board, loses another with
 * a reason, and sees only their own; the office admits a lead in one click
 * and gets the parent's login slip; the funnel report counts it all.
 *
 *   node tools/verifyEnquiries.mjs
 */
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
const IST = 330 * 60_000;
const istNow = new Date(Date.now() + IST);
const day = (n) => new Date(istNow.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const today = day(0);
const tomorrow = day(1);

console.log(`Starting the stack (today ${today})…`);
const s = await startStack({ apiPort: 5201, admsPort: 8301 });

try {
  const seeded = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { userService } from "./src/modules/user/user.service.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "${day(-200)}", endDate: "${day(160)}" });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    await batchService.create({ name: "Std. 10 – B1", standardId: std._id, academicYearId: year._id, startTime: "15:00", endTime: "18:00" });
    const a = await userService.create({ username: "asma", name: "Asma", role: "counselor" });
    const r = await userService.create({ username: "rafiq", name: "Rafiq", role: "counselor" });
    console.log("SEEDED " + a.temporaryPassword + " " + r.temporaryPassword);
    await mongoose.disconnect();
  `);
  const [asmaTemp, rafiqTemp] = /SEEDED (\S+) (\S+)/.exec(seeded).slice(1);

  // ---- a counselor at work -------------------------------------------------------------
  console.log("\nCounselor");
  const counselor = await s.newPage();
  const C = counselor.page;
  await s.signIn(C, "asma", asmaTemp);
  await s.forcedChange(C, asmaTemp, "Asma-Counsels-2026");
  await C.getByTestId("dashboard-screen").waitFor();
  await C.getByRole("link", { name: "Enquiries" }).click();
  await C.getByTestId("enquiries-screen").waitFor();

  await C.getByTestId("enquiry-new").click();
  await C.getByTestId("enquiry-form").waitFor();
  await C.getByTestId("enquiry-first").fill("Ayaan");
  await C.getByTestId("enquiry-last").fill("Shaikh");
  await C.getByTestId("enquiry-father").fill("Salim Shaikh");
  await C.getByTestId("enquiry-father-phone").fill("9819900001");
  await C.getByTestId("enquiry-followup-title").fill("Call about the demo lecture");
  await C.getByTestId("enquiry-followup-date").fill(tomorrow);
  await C.getByTestId("enquiry-followup-time").fill("10:00");
  await C.getByTestId("enquiry-save").click();
  await C.getByTestId("enquiry-detail").waitFor();
  await C.waitForTimeout(500);
  check((await C.evaluate(() => document.body.innerText)).includes("Enquiry #1"), "a lead is entered and numbered");
  await C.getByTestId("enquiry-note").fill("Father works nearby; prefers the evening batch.");
  await C.getByTestId("enquiry-note-add").click();
  check(await shows(C.getByText("Father works nearby; prefers the evening batch.")), "a note is kept on the lead");
  check(!(await C.getByTestId("enquiry-admit").count()), "a counselor follows leads up; admitting is the office's");
  await C.screenshot({ path: path.join(SHOTS, "enquiries-1-lead.png"), fullPage: true });

  // the same family again: the number is recognised
  await C.goto(`${s.WEB}/enquiries/new`);
  await C.getByTestId("enquiry-form").waitFor();
  await C.getByTestId("enquiry-first").fill("Zoya");
  await C.getByTestId("enquiry-father-phone").fill("9819900001");
  check(await shows(C.getByTestId("enquiry-matches")), "typing a known mobile shows the existing lead");
  await C.getByTestId("enquiry-father-phone").fill("9819900002");
  await C.getByTestId("enquiry-save").click();
  await C.getByTestId("enquiry-detail").waitFor();
  await C.getByTestId("enquiry-stage").getByText("Warm", { exact: true }).click();
  await C.getByText("Not joined", { exact: true }).last().click();
  check(await shows(C.getByTestId("enquiry-loss")), "losing a lead asks why");
  check(await C.getByTestId("enquiry-stage-save").isDisabled(), "…and cannot be saved without a reason");
  await C.getByTestId("enquiry-loss").getByText("Choose a reason", { exact: true }).click();
  await C.getByText("Fees", { exact: true }).last().click();
  await C.getByTestId("enquiry-stage-save").click();
  check(await shows(C.getByText("Not joined", { exact: true }).first()), "…and with a reason it is closed");

  await C.goto(`${s.WEB}/enquiries`);
  await C.getByTestId("enquiries-tab-board").click();
  check(await shows(C.getByTestId(`board-day-${tomorrow}`).getByText("Call about the demo lecture")), "tomorrow's call is on the week's board");
  await C.screenshot({ path: path.join(SHOTS, "enquiries-2-board.png"), fullPage: true });
  check(counselor.errors.length === 0, `no console errors for the counselor${counselor.errors.length ? `: ${counselor.errors.slice(0, 2).join(" | ")}` : ""}`);

  // another counselor sees none of it
  const other = await s.newPage();
  await s.signIn(other.page, "rafiq", rafiqTemp);
  await s.forcedChange(other.page, rafiqTemp, "Rafiq-Counsels-2026");
  await other.page.getByTestId("dashboard-screen").waitFor();
  await other.page.goto(`${s.WEB}/enquiries`);
  await other.page.getByTestId("enquiries-screen").waitFor();
  await other.page.waitForTimeout(1500);
  check(!(await other.page.getByTestId("enquiry-card-1").count()), "another counselor does not see Asma's leads");

  // ---- the office admits ------------------------------------------------------------------
  console.log("\nOffice");
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();
  await P.getByRole("link", { name: "Enquiries" }).click();
  check(await shows(P.getByTestId("enquiry-card-1")), "the office sees Asma's open lead");
  check(!(await P.getByTestId("enquiry-card-2").count()), "…and the lost one is out of the open list");
  await P.getByRole("tab", { name: "All", exact: true }).click();
  check(await shows(P.getByTestId("enquiry-card-2")), "…but there under All");
  await P.getByRole("tab", { name: "Open", exact: true }).click();
  await P.getByTestId("enquiry-card-1").click();
  await P.getByTestId("enquiry-detail").waitFor();
  await s.choose(P, "Choose the standard", "Std. 10");
  await s.choose(P, "Choose the batch", "Std. 10 – B1");
  await P.getByTestId("enquiry-admit-confirm").click();
  check(await shows(P.getByTestId("enquiry-admitted")), "one click makes the lead a student");
  check(await shows(P.getByText(/^P\d+$/).first()), "…and shows the parent's login on the admission slip");
  await P.screenshot({ path: path.join(SHOTS, "enquiries-3-admitted.png"), fullPage: true });
  await P.getByTestId("enquiry-open-student").click();
  check(await shows(P.getByTestId("student-detail")), "the new student's page opens");
  await P.waitForTimeout(800);
  check((await P.evaluate(() => document.body.innerText)).includes("Ayaan Shaikh"), "…with the lead's name");

  // no SMS gateway in this stack: the office is told plainly
  await P.goto(`${s.WEB}/enquiries`);
  await P.getByTestId("enquiries-screen").waitFor();
  await P.getByRole("tab", { name: "All", exact: true }).click();
  await P.getByTestId("enquiries-select-mode").click();
  await P.getByTestId("enquiry-card-2").click();
  await P.getByTestId("enquiries-sms").click();
  await P.getByTestId("enquiries-sms-text").fill("Demo lectures this Saturday at 11 am.");
  await P.getByTestId("enquiries-sms-send").click();
  check(await shows(P.getByText(/SMS is not set up/)), "with no SMS gateway, sending says so instead of failing silently");

  console.log("\nReports");
  await P.getByRole("link", { name: "Reports" }).click();
  await P.getByTestId("reports-screen").waitFor();
  await P.getByTestId("report-funnel").click();
  await P.getByTestId("report-run").click();
  check(await shows(P.getByTestId("report-table").getByText("Joined", { exact: true })), "the funnel lists the stages");
  check(await shows(P.getByTestId("report-totals").getByText(/50/)), "…and the conversion: one of two leads joined");
  await P.screenshot({ path: path.join(SHOTS, "enquiries-4-funnel.png"), fullPage: true });
  check(owner.errors.length === 0, `no console errors for the office${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 8 browser gate passed");
process.exit(failures() ? 1 : 0);
