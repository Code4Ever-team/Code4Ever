import { sendMail, appBaseUrl } from "@/lib/mail/smtp";

const RESET_TTL_HOURS = 1;

const ACCENT = "#007acc";
const BG = "#000000";
const CARD_BG = "#0a0a0a";
const BORDER = "#1e293b";
const TEXT = "#ffffff";
const MUTED = "#94a3b8";

export function passwordResetUrl(locale: string, token: string): string {
  return `${appBaseUrl()}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetHtml(url: string, locale: string): string {
  const isTr = locale === "tr";

  const greeting = isTr ? "Merhaba," : "Hello,";
  const intro = isTr
    ? "Code4Ever hesabın için şifre sıfırlama talebi aldık. Yeni şifreni belirlemek için aşağıdaki butona tıkla."
    : "We received a password reset request for your Code4Ever account. Click the button below to set a new password.";
  const buttonText = isTr ? "Şifreni Sıfırla" : "Reset Password";
  const expires = isTr
    ? `Bu bağlantı ${RESET_TTL_HOURS} saat geçerlidir.`
    : `This link expires in ${RESET_TTL_HOURS} hour(s).`;
  const footer = isTr
    ? "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin."
    : "If you did not request this, you can safely ignore this email.";
  const fallback = isTr
    ? "Buton çalışmıyorsa bu bağlantıyı tarayıcına yapıştır:"
    : "If the button does not work, paste this link into your browser:";

  return `<!DOCTYPE html>
<html lang="${isTr ? "tr" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code4Ever</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:${CARD_BG};border:1px solid ${BORDER};">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid ${BORDER};">
              <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:20px;font-weight:700;color:${TEXT};letter-spacing:0.05em;">Code4Ever</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${TEXT};">${greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:24px;color:${MUTED};">${intro}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background-color:${ACCENT};color:${TEXT};font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;border:1px solid ${ACCENT};">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${MUTED};">${expires}</p>
              <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">${footer}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${MUTED};">${fallback}</p>
              <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;">
                <a href="${url}" style="color:${ACCENT};text-decoration:none;">${url}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  locale: string,
  token: string
): Promise<void> {
  const url = passwordResetUrl(locale, token);
  const isTr = locale === "tr";

  const subject = isTr ? "Code4Ever — Şifre sıfırlama" : "Code4Ever — Password reset";
  const body = isTr
    ? `Merhaba,\n\nCode4Ever hesabın için şifre sıfırlama talebi aldık.\n\nŞifreni sıfırlamak için: ${url}\n\nBağlantı ${RESET_TTL_HOURS} saat geçerlidir.\n\nBu isteği sen yapmadıysan bu e-postayı yok say.`
    : `Hello,\n\nWe received a password reset request for your Code4Ever account.\n\nReset your password: ${url}\n\nLink expires in ${RESET_TTL_HOURS} hour(s).\n\nIf you did not request this, ignore this email.`;

  const html = buildPasswordResetHtml(url, locale);

  await sendMail({ to, subject, text: body, html });
}
