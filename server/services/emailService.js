import nodemailer from "nodemailer";
let transporter;
function getTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}
// BCC se bhejte hain taaki subscribers ek-dusre ke email na dekhein
export async function sendBulk(list, subject, text) {
  const t = getTransport();
  if (!t || !list.length) return 0;
  try {
    await t.sendMail({ from: `FloodGuard AI <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, bcc: list, subject, text });
    return list.length;
  } catch (e) {
    console.error("Email error:", e.message);
    return 0;
  }
}

export async function sendTest(to) {
  const t = getTransport();
  if (!t) return { ok: false, error: "SMTP_USER / SMTP_PASS are not set in server/.env" };
  try {
    await t.sendMail({ from: `FloodGuard AI <${process.env.SMTP_USER}>`, to, subject: "FloodGuard AI test email", text: "Email is working. This is a test from your FloodGuard AI admin panel." });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
