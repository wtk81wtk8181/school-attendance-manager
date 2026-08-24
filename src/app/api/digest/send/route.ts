import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildAbsenceWorkbook } from "@/lib/excel-digest";
import { SCHOOL_NAME } from "@/lib/seed";
import type { DigestPayload } from "@/lib/digest";

interface SendBody {
  payload: DigestPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.schoolDay) {
    return NextResponse.json({ error: "缺少上課日資料。" }, { status: 400 });
  }

  const filename = `缺席名單-${body.payload.schoolDay}.xlsx`;
  const buffer = await buildAbsenceWorkbook(body.payload);
  const fileBase64 = buffer.toString("base64");

  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);
  let mode: "smtp" | "mock" = "mock";

  if (body.sendEmail && enabledRecipients.length > 0 && hasSmtpConfig()) {
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

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || `attendance@${"localhost"}`;
    await transporter.sendMail({
      from: `${SCHOOL_NAME}校務處 <${from}>`,
      to: enabledRecipients.map((item) => item.email).join(", "),
      subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 全校缺席名單`,
      html: emailHtml(body.payload, enabledRecipients),
      attachments: [
        {
          filename,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
    mode = "smtp";
  }

  return NextResponse.json({
    ok: true,
    mode: body.sendEmail ? mode : "mock",
    emailed: Boolean(body.sendEmail && enabledRecipients.length > 0),
    filename,
    fileBase64,
    recipientCount: enabledRecipients.length,
  });
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST);
}

function emailHtml(
  payload: DigestPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const lines = payload.summaries
    .map(
      (item) =>
        `<tr><td>${item.classLabel}</td><td>${item.teacher}</td><td>${item.absent}</td><td>${item.leave}</td><td>${item.pending}</td></tr>`
    )
    .join("");

  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${payload.schoolDay} 上課日之<strong>全校各班缺席名單</strong>（Excel）。資料已由 eClass 點名自動整合。</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr>
          <th>班別</th><th>班主任</th><th>缺席</th><th>請假</th><th>待審核</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
    <p>請班主任核對本班名單；校務處請跟進醫生證明／家長信審核。獲批請假不計入出席率及缺席上限。</p>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
