import { sendMail, isSmtpConfigured, appBaseUrl } from "@/lib/mail/smtp";
import { buildC4eEmailHtml, buildC4eEmailText } from "@/lib/mail/c4e-email-template";
import { logger } from "@/lib/logger";

export async function sendAdminChangeEmail(
  to: string,
  locale: string,
  changeSummary: string,
  adminUsername: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    logger.warn("sendAdminChangeEmail skipped — SMTP not configured", { to });
    return;
  }

  const isTr = locale === "tr";
  const subject = isTr
    ? "Code4Ever — Hesabında yetkili değişiklik"
    : "Code4Ever — Authorized change on your account";

  const intro = isTr
    ? `Code4Ever hesabında bir yetkili (@${adminUsername}) şu değişikliği yaptı:\n\n${changeSummary}\n\nBu değişikliği tanımıyorsan destek ile iletişime geç.`
    : `An authorized Code4Ever admin (@${adminUsername}) made the following change to your account:\n\n${changeSummary}\n\nIf you do not recognize this change, contact support.`;

  const content = {
    locale,
    intro,
    buttonText: isTr ? "Hesabına Git" : "Go to your account",
    buttonUrl: `${appBaseUrl()}/${locale}/settings`,
  };

  await sendMail({
    to,
    subject,
    text: buildC4eEmailText(content),
    html: buildC4eEmailHtml(content),
  });
}

export async function sendAdminCustomEmail(
  to: string,
  locale: string,
  subject: string,
  intro: string,
  buttonText?: string,
  buttonUrl?: string,
  footer?: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const content = {
    locale,
    intro,
    buttonText,
    buttonUrl,
    footer,
  };

  await sendMail({
    to,
    subject,
    text: buildC4eEmailText(content),
    html: buildC4eEmailHtml(content),
  });
}
