import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

function transport() {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  transporter = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
      })
    : null;
  return transporter;
}

/** For tests: inject a transport (e.g. nodemailer's jsonTransport). */
export function setTransport(t: Transporter | null) {
  transporter = t;
}

export function emailEnabled() {
  return transport() !== null;
}

export async function sendMail(to: string | string[], subject: string, text: string) {
  const t = transport();
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!t || !recipients.length) return false;
  await t.sendMail({ from: process.env.SMTP_FROM, to: recipients, subject, text });
  return true;
}
