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
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const vercelPublic = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelHost = process.env.VERCEL_URL?.trim();

  let base =
    fromSite ||
    fromApp ||
    (vercelPublic ? normalizeHost(vercelPublic) : "") ||
    (vercelHost ? normalizeHost(vercelHost) : "") ||
    "http://127.0.0.1:3000";

  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  return base.replace(/\/$/, "");
}

function normalizeHost(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
