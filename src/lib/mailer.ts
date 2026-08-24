export function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export function smtpRequiredMessage() {
  return "未設定 SMTP，無法寄出電郵。請在 Vercel 專案設定 SMTP_HOST、SMTP_USER、SMTP_PASS。";
}

export function parseEmailAddresses(input: string): string[] {
  return [...new Set(input.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean))];
}

export function toMailRecipients(emails: string[]) {
  return emails.map((email) => ({
    name: email.split("@")[0] || email,
    email,
  }));
}

export async function sendMail(input: {
  subject: string;
  html: string;
  fromName: string;
  recipients: Array<{ name: string; email: string }>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}): Promise<void> {
  if (!hasSmtpConfig()) {
    throw new Error(smtpRequiredMessage());
  }
  if (input.recipients.length === 0) {
    throw new Error("請輸入至少一個電郵地址。");
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "attendance@localhost";
  await transporter.sendMail({
    from: `${input.fromName} <${from}>`,
    to: input.recipients.map((item) => item.email).join(", "),
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}
