#!/usr/bin/env node
/**
 * Phase 9 gate in a real browser (docs/PHASES.md): GST and a fee plan set by
 * the owner, a payment taken and its receipt printed with the tax inside it,
 * a cheque that bounces, a day's expense, the dashboard's money tiles, what
 * is outstanding, and the family's own view.
 *
 *   node tools/verifyFees.mjs
 */
import path from "node:path";
import { startStack, checker, shows, SHOTS } from "./lib/e2e.mjs";

const { check, failures, fail } = checker();
const IST = 330 * 60_000;
const istNow = new Date(Date.now() + IST);
const day = (n) => new Date(istNow.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const today = day(0);

console.log(`Starting the stack (today ${today})…`);
const s = await startStack({ apiPort: 5202, admsPort: 8302 });

/** Open a Select by its wrapper's testID and pick an option. */
async function pick(page, wrapper, option) {
  await page.getByTestId(wrapper).getByRole("button").first().click();
  await page.getByText(option, { exact: true }).last().click();
}

try {
  const seeded = s.backScript(`
    import mongoose from "mongoose";
    import { connectDb } from "./src/config/db.js";
    import { academicYearService } from "./src/modules/academic-year/academic-year.service.js";
    import { AcademicYearModel } from "./src/modules/academic-year/academic-year.model.js";
    import { standardService } from "./src/modules/standard/standard.service.js";
    import { batchService } from "./src/modules/batch/batch.service.js";
    import { studentService } from "./src/modules/student/student.service.js";
    import { userService } from "./src/modules/user/user.service.js";
    await connectDb();
    const year = await academicYearService.create({ label: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" });
    await AcademicYearModel.updateOne({ _id: year._id }, { $set: { isCurrent: true } });
    const std = await standardService.create({ name: "Std. 10", code: "10", grPrefix: "10", grStartAt: 501 });
    const batch = await batchService.create({ name: "Std. 10 – B1", standardId: std._id, academicYearId: year._id, startTime: "15:00", endTime: "18:00" });
    const r = await studentService.admit({ firstName: "Ayesha", lastName: "Khan", standardId: String(std._id), batchId: String(batch._id), admissionDate: "${day(-30)}", guardians: [{ relation: "father", name: "Imran Khan", phone: "9819936166" }] });
    const desk = await userService.create({ username: "desk1", name: "Front Desk", role: "front_desk" });
    console.log("SEEDED " + r.student._id + " " + r.parentLogin.username + " " + r.parentLogin.temporaryPassword + " " + desk.temporaryPassword);
    await mongoose.disconnect();
  `);
  const [studentId, parentUser, parentTemp, deskTemp] = /SEEDED (\S+) (\S+) (\S+) (\S+)/.exec(seeded).slice(1);

  const owner = await s.newPage();
  const P = owner.page;
  await s.signIn(P, "akbar", s.ownerTemp);
  await s.forcedChange(P, s.ownerTemp, "Akbars-Owner-2026");
  await P.getByTestId("dashboard-screen").waitFor();

  console.log("\nSettings and plan");
  await P.goto(`${s.WEB}/settings`);
  await P.getByTestId("settings-screen").waitFor();
  await P.getByText("Fees & GST", { exact: true }).click();
  await P.getByTestId("fees-gstin").fill("27AAAPA1234A1Z5");
  await P.getByTestId("fees-gst-percent").fill("18");
  await P.getByTestId("fees-gst-from").fill("2017-07-01");
  await P.getByTestId("fees-gst-add").click();
  await P.getByTestId("fees-settings-save").click();
  check(await shows(P.getByText("Saved. New receipts use these.")), "the owner sets the GSTIN and 18% GST from July 2017");

  await P.getByRole("link", { name: "Fees", exact: true }).click();
  await P.getByTestId("fees-screen").waitFor();
  await P.getByTestId("fees-tab-plans").click();
  await P.getByTestId("plan-new").click();
  await P.getByTestId("plan-name").fill("Std. 10 — 2026-27");
  await pick(P, "plan-standard", "Std. 10");
  await P.getByTestId("plan-item-amount-0").fill("30000");
  await P.getByTestId("plan-minimum").fill("25000");
  await P.getByTestId("plan-split").click();
  await P.getByTestId("plan-save").click();
  check(await shows(P.getByTestId("plan-card-Std. 10 — 2026-27")), "a fee plan of ₹30,000 in three instalments is made");
  await P.getByTestId("plan-apply-Std. 10 — 2026-27").click();
  check(await shows(P.getByText(/^1 set up/)), "…and set up for the standard's students in one go");
  await P.screenshot({ path: path.join(SHOTS, "fees-1-plan.png"), fullPage: true });

  console.log("\nPayments");
  await P.goto(`${s.WEB}/students/${studentId}`);
  await P.getByTestId("fees-card").waitFor();
  check(await shows(P.getByTestId("fees-net").getByText("₹30,000")), "the student's page shows the fee");
  await P.getByTestId("fees-pay").click();
  await P.getByTestId("fees-pay-amount").fill("10000");
  await pick(P, "fees-pay-mode", "UPI");
  await P.getByTestId("fees-pay-reference").fill("UPI 4471 2290");
  await P.getByTestId("fees-pay-save").click();
  check(await shows(P.getByText(/Receipt R\/2026-27\/0001/).first()), "a UPI payment gives receipt R/2026-27/0001");
  check(await shows(P.getByTestId("fees-paid").getByText("₹10,000")), "…and shows as paid");

  // the printed receipt: keep the window's print from opening a dialog, read what was printed
  await P.evaluate(() => {
    const proto = HTMLIFrameElement.prototype;
    const get = Object.getOwnPropertyDescriptor(proto, "contentWindow").get;
    Object.defineProperty(proto, "contentWindow", {
      get() {
        const w = get.call(this);
        if (w) {
          w.print = () => {
            window.__printed = this.contentDocument.body.innerText;
          };
        }
        return w;
      },
    });
  });
  await P.getByTestId("fees-print-R/2026-27/0001").click();
  await P.waitForFunction(() => window.__printed, null, { timeout: 15_000 });
  const printed = await P.evaluate(() => window.__printed);
  check(/Rupees Ten Thousand Only/i.test(printed), "the receipt shows the amount in words");
  check(printed.includes("27AAAPA1234A1Z5") && /CGST/.test(printed) && /SGST/.test(printed), "…the GSTIN, and the CGST and SGST inside the amount");

  await P.getByTestId("fees-pay").click();
  await P.getByTestId("fees-pay-amount").fill("5000");
  await pick(P, "fees-pay-mode", "Cheque");
  await P.getByTestId("fees-cheque-number").fill("004512");
  await P.getByTestId("fees-cheque-bank").fill("SBI Kurla");
  await P.getByTestId("fees-pay-save").click();
  check(await shows(P.getByTestId("fees-paid").getByText("₹15,000")), "a cheque counts while it waits to clear");
  await P.getByTestId("fees-bounce-R/2026-27/0002").click();
  await P.getByTestId("fees-bounce-note").fill("Insufficient funds");
  await P.getByTestId("fees-bounce-confirm").click();
  await P.getByText("Yes, it bounced", { exact: true }).click();
  check(await shows(P.getByTestId("fees-paid").getByText("₹10,000")), "a bounced cheque is taken back out");
  await P.screenshot({ path: path.join(SHOTS, "fees-2-student.png"), fullPage: true });

  console.log("\nExpenses and the dashboard");
  await P.getByRole("link", { name: "Expenses" }).click();
  await P.getByTestId("expenses-screen").waitFor();
  await P.getByTestId("expense-new").click();
  await P.getByTestId("expense-category").fill("Electricity");
  await P.getByTestId("expense-vendor").fill("BEST");
  await P.getByTestId("expense-amount").fill("4500");
  await P.getByTestId("expense-save").click();
  check(await shows(P.getByTestId("expense-row-V/2026-27/0001")), "an expense gets voucher V/2026-27/0001");
  check(await shows(P.getByTestId("expense-total").getByText("₹4,500")), "…and is in the month's total");

  await P.getByRole("link", { name: "Dashboard" }).click();
  check(await shows(P.getByTestId("money-collected-today").getByText("₹10,000")), "the dashboard: collected today, without the bounced cheque");
  check(await shows(P.getByTestId("money-spent-today").getByText("₹4,500")), "…and spent today");
  await P.screenshot({ path: path.join(SHOTS, "fees-3-dashboard.png"), fullPage: true });

  await P.getByRole("link", { name: "Fees", exact: true }).click();
  await P.getByTestId("fees-tab-outstanding").click();
  check(await shows(P.getByTestId("fees-outstanding-table").getByText("Ayesha Khan")), "the outstanding list has Ayesha");
  check(await shows(P.getByTestId("fees-outstanding-total").getByText(/₹20,000/)), "…with ₹20,000 still to pay");
  check(owner.errors.length === 0, `no console errors for the owner${owner.errors.length ? `: ${owner.errors.slice(0, 2).join(" | ")}` : ""}`);

  console.log("\nThe desk and the family");
  const desk = await s.newPage();
  await s.signIn(desk.page, "desk1", deskTemp);
  await s.forcedChange(desk.page, deskTemp, "Front-Desk-Strong-9");
  await desk.page.getByTestId("dashboard-screen").waitFor();
  check(await shows(desk.page.getByRole("link", { name: "Fees", exact: true })), "the front desk takes fees");
  check(!(await desk.page.getByRole("link", { name: "Expenses" }).count()), "…but does not see expenses");

  const parent = await s.newPage({ width: 390, height: 844 });
  const Q = parent.page;
  await s.signIn(Q, parentUser, parentTemp, { parent: true });
  await s.forcedChange(Q, parentTemp, "Family-Strong-2026");
  await Q.getByTestId("parent-home").waitFor();
  await Q.goto(`${s.WEB}/parent/more/fees`);
  check(await shows(Q.getByTestId("parent-fees-balance").getByText("₹20,000")), "the family sees ₹20,000 still to pay");
  check(await shows(Q.getByTestId("parent-receipt-R/2026-27/0001")), "…and its receipt");
  await Q.screenshot({ path: path.join(SHOTS, "fees-4-parent.png"), fullPage: true });
  const overflow = await Q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `the family's fees page has no horizontal overflow on a phone (${overflow}px)`);
  check(parent.errors.length === 0, `no console errors for the family${parent.errors.length ? `: ${parent.errors.slice(0, 2).join(" | ")}` : ""}`);
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.error("\n--- browser diagnostics (last 25) ---\n" + s.diagnostics.slice(-25).join("\n"));
  fail();
} finally {
  await s.stop();
}

console.log(failures() ? `\n${failures()} check(s) failed` : "\nPhase 9 browser gate passed");
process.exit(failures() ? 1 : 0);
