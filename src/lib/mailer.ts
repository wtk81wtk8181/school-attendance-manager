import nodemailer from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(input: {
  subject: string;
  html: string;
  fromName: string;
  recipients: Array<{ name: string; email: string }>;
  attachments?: MailAttachment[];
}): Promise<"smtp" | "mock"> {
  if (!hasSmtpConfig() || input.recipients.length === 0) return "mock";

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
  return "smtp";
}
