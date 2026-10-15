#!/usr/bin/env node
/**
 * Phase 7 gate in a real browser (docs/PHASES.md): a test's marks published
 * to the families, a notice and a worksheet shared with one batch, a report
 * exported to Excel, and a parent's question answered by the office — each
 * seen from both sides.
 *
 *   node tools/verifyAcademics.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
const IST = 330 * 60_000;
const istNow = new Date(Date.now() + IST);
const day = (n) => new Date(istNow.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const today = day(0);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

console.log(`Starting the stack (today ${today})…`);
const s = await startStack({ apiPort: 5200, admsPort: 8300 });

try {
  const seeded = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { studentService } from "./src/modules/student/student.service.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "${day(-200)}", endDate: "${day(160)}" });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    const mk = (name) => batchService.create({ name, standardId: std._id, academicYearId: year._id, startTime: "15:00", endTime: "18:00", workingDays: ["sun","mon","tue","wed","thu","fri","sat"] });
    const b1 = await mk("Std. 10 – B1");
    const b2 = await mk("Std. 10 – B2");
    const out = [];
    for (const [first, batch, phone] of [["Ayesha", b1, "9819936201"], ["Zaid", b1, "9819936202"], ["Omar", b2, "9819936203"]]) {
      const r = await studentService.admit({ firstName: first, lastName: "Khan", standardId: String(std._id), batchId: String(batch._id), admissionDate: "${day(-30)}", guardians: [{ relation: "father", phone }] });
      out.push(r.parentLogin.username + ":" + r.parentLogin.temporaryPassword);
    }
    console.log("SEEDED " + out.join(" "));
    await mongoose.disconnect();
  `);
  const [ayesha] = /SEEDED (.*)/.exec(seeded)[1].split(" ").map((x) => {
    const [username, temp] = x.split(":");
    return { username, temp };
  });

  // ---- the office ----------------------------------------------------------------------
  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();

  console.log("\nTests");
  await P.getByRole("link", { name: "Tests", exact: true }).click();
  await P.getByTestId("exams-screen").waitFor();
  await P.getByTestId("exam-new").click();
  await P.getByTestId("exam-name").fill("Unit Test 3");
  await P.getByTestId("exam-subject").fill("Maths");
  await s.choose(P, "Choose a standard", "Std. 10");
  await P.getByTestId("exam-batch-Std. 10 – B1").click();
  await P.getByTestId("exam-date").fill(day(-1));
  await P.getByTestId("exam-max").fill("50");
  await P.getByTestId("exam-save").click();
  await P.getByTestId("exam-card-Unit Test 3").click();
  await P.getByTestId("exam-sheet").waitFor();
  check(await shows(P.getByTestId("marks-10501")) && (await shows(P.getByTestId("marks-10502"))), "the sheet lists the batch's students, not the other batch's");
  check(!(await P.getByTestId("marks-10503").count()), "…and not Omar, who is in B2");
  await P.getByTestId("marks-10501").fill("45");
  await P.getByTestId("marks-10502").fill("38");
  await P.getByTestId("marks-save").click();
  await P.waitForTimeout(800);
  await P.getByTestId("exam-publish").click();
  check(await shows(P.getByText("Results sent to 2 families.")), "publishing sends each family their child's result");
  await P.screenshot({ path: path.join(SHOTS, "academics-1-test.png"), fullPage: true });

  console.log("\nNotice board and documents");
  await P.getByRole("link", { name: "Notice board" }).click();
  await P.getByTestId("notices-screen").waitFor();
  await P.getByTestId("notice-new").click();
  await P.getByTestId("notice-title").fill("Parents' meeting");
  await P.getByTestId("notice-body").fill("Saturday at 11 am, for Std. 10 – B1.");
  await P.getByTestId("audience-batches").click();
  await P.getByTestId("audience-batch-Std. 10 – B1").click();
  await P.getByTestId("notice-save").click();
  check(await shows(P.getByTestId("notice-card-Parents' meeting").getByText("Sent to 2 families")), "a notice for one batch reaches its two families");

  await P.getByRole("link", { name: "Documents", exact: true }).click();
  await P.getByTestId("documents-screen").waitFor();
  await P.getByTestId("document-new").click();
  await P.getByTestId("document-title").fill("Algebra worksheet 4");
  await P.getByTestId("document-file-input").setInputFiles({ name: "algebra-4.pdf", mimeType: "application/pdf", buffer: PDF });
  check(await shows(P.getByTestId("document-file-chosen")), "the chosen file is shown before sharing");
  await P.getByTestId("audience-batches").click();
  await P.getByTestId("audience-batch-Std. 10 – B1").click();
  await P.getByTestId("document-save").click();
  check(await shows(P.getByTestId("document-card-Algebra worksheet 4")), "a worksheet is shared with the batch");
  await P.screenshot({ path: path.join(SHOTS, "academics-2-documents.png"), fullPage: true });

  console.log("\nReports");
  await P.getByRole("link", { name: "Reports" }).click();
  await P.getByTestId("reports-screen").waitFor();
  await P.getByTestId("report-performance").click();
  await s.choose(P, "Choose a batch", "Std. 10 – B1");
  await P.getByTestId("report-run").click();
  check(await shows(P.getByTestId("report-table").getByText("Ayesha Khan")), "the batch performance report lists the test");
  const [download] = await Promise.all([P.waitForEvent("download"), P.getByTestId("report-excel").click()]);
  const csv = fs.readFileSync(await download.path(), "utf8");
  check(download.suggestedFilename().endsWith(".csv") && csv.charCodeAt(0) === 0xfeff && /Ayesha Khan/.test(csv), "Excel export downloads the rows (UTF-8 CSV)");
  await P.screenshot({ path: path.join(SHOTS, "academics-3-report.png"), fullPage: true });

  // ---- the parent -------------------------------------------------------------------------
  console.log("\nParent");
  const parent = await s.newPage({ width: 390, height: 844 });
  const Q = parent.page;
  await s.signIn(Q, ayesha.username, ayesha.temp, { parent: true });
  await s.forcedChange(Q, ayesha.temp, "Family-Strong-2026");
  await Q.getByTestId("parent-home").waitFor();
  await Q.getByTestId("tab-more").click();
  await Q.getByTestId("parent-more").waitFor();
  await Q.getByText("Test results", { exact: true }).click();
  check(await shows(Q.getByTestId("result-marks").getByText("45/50")), "the parent sees the mark");
  check(await shows(Q.getByText(/rank 1 of 2/)), "…the rank, and the class's numbers");
  await Q.screenshot({ path: path.join(SHOTS, "academics-4-parent-results.png"), fullPage: true });

  await Q.goto(`${s.WEB}/parent/more/notices`);
  check(await shows(Q.getByTestId("parent-notice-Parents' meeting")), "the notice is on the family's board");
  await Q.goto(`${s.WEB}/parent/more/documents`);
  // record the link the app opens (headless Chromium has no PDF viewer to show it), then fetch it
  await Q.evaluate(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(String(url));
      return null;
    };
  });
  await Q.getByTestId("parent-document-open-Algebra worksheet 4").click();
  await Q.waitForFunction(() => window.__opened.length > 0);
  const opened = await Q.evaluate(() => window.__opened[0]);
  const res = await Q.request.get(opened);
  check(
    opened.includes("/api/v1/files/") && res.status() === 200 && res.headers()["content-type"] === "application/pdf" && (await res.body()).equals(PDF),
    "the worksheet opens from a short-lived link, as the very PDF that was shared",
  );

  await Q.goto(`${s.WEB}/parent/more/questions`);
  await Q.getByTestId("issue-new").click();
  await Q.getByTestId("issue-title").fill("Wrong absent mark");
  await Q.getByTestId("issue-description").fill("Ayesha was present on Monday but shows absent.");
  await Q.getByTestId("issue-send").click();
  check(await shows(Q.getByTestId("parent-issue")), "the parent writes to the academy");

  // ---- the office answers ------------------------------------------------------------------
  console.log("\nIssues");
  await P.getByRole("link", { name: "Issues" }).click();
  await P.getByTestId("issues-screen").waitFor();
  await P.getByTestId("issue-card-1").click();
  await P.getByTestId("issue-detail").waitFor();
  await P.getByTestId("issue-reply").fill("Checked — corrected to present. Sorry for the trouble.");
  await P.getByTestId("issue-send").click();
  check(await shows(P.getByText("Checked — corrected to present. Sorry for the trouble.")), "the office replies");
  await P.getByTestId("issue-internal").click();
  await P.getByTestId("issue-reply").fill("Machine missed her punch.");
  await P.getByTestId("issue-send").click();
  check(await shows(P.getByText("Machine missed her punch.")), "…and keeps a note for staff");
  await P.screenshot({ path: path.join(SHOTS, "academics-5-issue.png"), fullPage: true });
  check(owner.errors.length === 0, `no console errors for the office${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  await Q.reload();
  await Q.getByTestId("parent-issue").waitFor();
  check(await shows(Q.getByText("Checked — corrected to present. Sorry for the trouble.")), "the parent sees the reply");
  check(!(await Q.getByText("Machine missed her punch.").count()), "…and not the staff note");
  await Q.goto(`${s.WEB}/parent/alerts`);
  check(await shows(Q.getByText(/^Issue #1/).first()), "the reply also arrives as an alert");
  const overflow = await Q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `the parent app has no horizontal overflow on a phone (${overflow}px)`);
  check(parent.errors.length === 0, `no console errors for the parent${parent.errors.length ? `: ${parent.errors.slice(0, 2).join(" | ")}` : ""}`);
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 7 browser gate passed");
process.exit(failures() ? 1 : 0);
