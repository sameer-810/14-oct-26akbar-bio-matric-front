# Akbars Academy: Staff Guide

For the owner, branch managers, front desk, counselors and teachers.

**Open it:** https://attend.fiveminfotech.com (browser, on a computer or phone).

---

## 1. Signing in

1. Open the link and tap **Staff** (not Parent).
2. Enter your **Username** and **Password**.
3. First time: you signed in with a temporary password, so the app asks you to **set your own**. Do that before anything else.

Forgot your password? Ask the owner. Only the owner can reset staff logins.

---

## 2. What you can see depends on your role

The left menu only shows what your role allows. If a menu item is missing, you don't have that permission. Ask the owner.

| Role | Can do | Cannot do |
|---|---|---|
| **Owner / Admin** | Everything, including staff logins, settings, and risky machine actions. | n/a |
| **Branch manager** | Runs the day: students, batches, fees, teachers, salary, reports, machines. | Create logins, change settings. |
| **Front desk** | Admissions, enquiries, attendance corrections, fee collection, notices, issues. | Salary, fee reports, publishing marks. |
| **Counselor** | Enquiries and follow-ups; can look at students, batches and lectures. | Attendance and money. |
| **Teacher** | Their batches' register, lectures and entering marks. | Money, logins, machines. |

The owner can adjust one person's permissions up or down.

---

## 3. Menu tour

**Overview:** *Dashboard* (today's numbers), *Reports*.

**People:** *Enquiries* (admission leads), *Students*, *Batches*, *Faculty*.

**Teaching:** *Lectures*, *Tests* (exams and marks), *Holidays*.

**Attendance:**
- *Today*: live board of who is in right now.
- *Registers*: the class register per batch and date.
- *Punches*: every raw fingerprint scan.
- *Leave requests*: parents' leave applications.
- *Parent alerts*: the log of messages sent to parents.
- *Fingerprint machines*: the machine's status and approval.

**Communication:** *Notice board*, *Documents*, *Issues* (questions from parents).

**Money:** *Fees*, *Expenses*, *Faculty salary*.

**Admin (owner):** *Staff logins*, *Settings*, *Audit trail*.

**Workspace:** *My teaching* (teachers only), *My account*.

---

## 4. Everyday jobs

### Admit a student (front desk, manager)
1. **Students → Admit student**.
2. Fill in the student's and parent's details and choose the batch.
3. Save. The student gets a GR number.
4. Give the parent their **username and temporary password** so they can use the Parent app.
5. Enrol the student's finger on the machine (see section 6).

### Handle an enquiry (counselor, front desk)
1. **Enquiries → New**; add the lead's details.
2. Open the lead to add follow-up notes and the next call date.
3. When they join, convert it to a student (admit).

### Take attendance
Attendance is automatic: students punch at the machine, and the register fills itself.
- **Registers →** pick the batch and date. Each row shows *Status*, *In*, *Out* and *In class*.
- **Add a lecture** with start time, end time and subject if the day's plan changes.
- **Fix a wrong mark** (front desk, manager): open the student's row and use the override. **You must give a reason.** Every correction is saved in the Audit trail with your name.

### Approve a leave request
**Leave requests →** open it → approve or decline. The parent sees the result.

### Collect a fee (front desk, manager)
1. **Fees →** find the student.
2. Record the amount, mode (cash, cheque, online), and date.
3. Save; a receipt is created. Cancelling a receipt, discounts and refunds are manager/owner only.

### Enter marks (teacher)
1. **Tests →** open the test, then the sheet.
2. Type each student's marks and save.
3. A manager or owner **publishes** the test. Parents see results only after publishing.

### Post a notice or share a worksheet
- **Notice board →** new notice (holiday, meeting). It reaches parents.
- **Documents →** upload a worksheet or notes (up to 10 MB). Parents can open them.

### Reply to a parent's question
**Issues →** open the question, type a reply, and close it when done.

---

## 5. Payroll (manager, owner)
**Faculty salary** shows the salary report. Setting a teacher's pay rate is owner/manager only.

---

## 6. The fingerprint machine

- Students and teachers press a finger on the machine. The machine sends the punch to the server by itself.
- **Fingerprint machines** shows if the machine is online. If it shows *Pending*, a manager must **approve** it once. Until then, punches are held safely and replayed after approval.
- **Never** clear the machine's log or reboot it during class from the machine's own menu. These risky actions are owner-only in the app.
- **Machine setting (done once, by the owner):** Web Server URL `http://16.178.151.25:80/`, mode FkWeb.

---

## 7. The owner's extras

- **Staff logins:** create a login, choose the role, reset a password. Only the owner can.
- **Settings:** academy-wide settings.
- **Audit trail:** who changed what, and why. Use it when a number looks wrong.

---

## 8. Good habits

- Always give a **real reason** for corrections. It is saved permanently.
- Sign out on shared computers.
- Never share your login. Each person gets their own.
- Spotted something wrong? Don't edit around it; tell the manager.

---

## Quick fixes

| Problem | Try |
|---|---|
| Can't sign in | Is **Staff** selected? Check the username spelling and caps lock. Ask the owner to reset. |
| Menu item missing | Your role doesn't allow it. Ask the owner. |
| No punches arriving | **Fingerprint machines**: is it online and *Approved*? If not, tell the manager/owner. |
| Page won't load | Check the internet; refresh. If everyone is affected, tell the owner. |
