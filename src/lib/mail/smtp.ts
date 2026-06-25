import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

function smtpFrom(): string {
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "noreply@c4e.com";
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });

  await transporter.sendMail({
    from: smtpFrom(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
}
