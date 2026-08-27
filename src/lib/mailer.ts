import { parseEmailAddresses, toMailRecipients } from "@/lib/email-utils";

export { parseEmailAddresses, toMailRecipients };

export function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export function smtpRequiredMessage() {
  return "未設定 SMTP，無法寄出電郵。請在 Vercel 專案設定 SMTP_HOST、SMTP_USER、SMTP_PASS。";
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
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE !== "false" && port === 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 25_000,
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

export function reportSendPayload(input: {
  sendEmail: boolean;
  filename: string;
  buffer: Buffer;
  recipientCount: number;
}) {
  return {
    ok: true as const,
    mode: input.sendEmail ? ("smtp" as const) : ("export" as const),
    emailed: Boolean(input.sendEmail && input.recipientCount > 0),
    filename: input.filename,
    fileBase64: input.sendEmail ? "" : input.buffer.toString("base64"),
    recipientCount: input.recipientCount,
  };
}
