export const C4E_MAIL = {
  accent: "#007acc",
  bg: "#000000",
  cardBg: "#0a0a0a",
  border: "#1e293b",
  text: "#ffffff",
  muted: "#94a3b8",
} as const;

export interface C4eEmailContent {
  locale: string;
  greeting?: string;
  intro: string;
  buttonText?: string;
  buttonUrl?: string;
  footer?: string;
  fallbackLabel?: string;
}

export function buildC4eEmailHtml(content: C4eEmailContent): string {
  const isTr = content.locale === "tr";
  const greeting = content.greeting ?? (isTr ? "Merhaba," : "Hello,");
  const footer =
    content.footer ??
    (isTr
      ? "Bu e-postayı tanımıyorsan yok sayabilirsin."
      : "If you do not recognize this email, you can ignore it.");
  const fallback =
    content.fallbackLabel ??
    (isTr ? "Buton çalışmıyorsa bu bağlantıyı kullan:" : "If the button does not work, use this link:");

  const buttonBlock =
    content.buttonText && content.buttonUrl
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${content.buttonUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background-color:${C4E_MAIL.accent};color:${C4E_MAIL.text};font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;border:1px solid ${C4E_MAIL.accent};">${content.buttonText}</a>
                  </td>
                </tr>
              </table>`
      : "";

  const fallbackBlock =
    content.buttonUrl && content.buttonText
      ? `<tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${C4E_MAIL.border};">
              <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${C4E_MAIL.muted};">${fallback}</p>
              <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;">
                <a href="${content.buttonUrl}" style="color:${C4E_MAIL.accent};text-decoration:none;">${content.buttonUrl}</a>
              </p>
            </td>
          </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="${isTr ? "tr" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code4Ever</title>
</head>
<body style="margin:0;padding:0;background-color:${C4E_MAIL.bg};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${C4E_MAIL.bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:${C4E_MAIL.cardBg};border:1px solid ${C4E_MAIL.border};">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid ${C4E_MAIL.border};">
              <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:20px;font-weight:700;color:${C4E_MAIL.text};letter-spacing:0.05em;">Code4Ever</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${C4E_MAIL.text};">${greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:24px;color:${C4E_MAIL.muted};white-space:pre-wrap;">${content.intro}</p>
              ${buttonBlock}
              <p style="margin:0;font-size:13px;line-height:20px;color:${C4E_MAIL.muted};">${footer}</p>
            </td>
          </tr>
          ${fallbackBlock}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildC4eEmailText(content: C4eEmailContent): string {
  const lines = [content.greeting ?? "Hello,", "", content.intro];
  if (content.buttonUrl) lines.push("", content.buttonUrl);
  if (content.footer) lines.push("", content.footer);
  return lines.join("\n");
}
