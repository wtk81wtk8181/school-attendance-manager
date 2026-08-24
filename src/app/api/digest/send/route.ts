import { NextResponse } from "next/server";
import { buildAbsenceWorkbook } from "@/lib/excel-digest";
import { SCHOOL_NAME } from "@/lib/seed";
import { sendMail } from "@/lib/mailer";
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

  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);
  let mode: "smtp" | "mock" = "mock";

  if (body.sendEmail && enabledRecipients.length > 0) {
    mode = await sendMail({
      fromName: `${SCHOOL_NAME}校務處`,
      subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 全校缺席名單`,
      html: emailHtml(body.payload, enabledRecipients),
      recipients: enabledRecipients,
      attachments: [
        {
          filename,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }

  return NextResponse.json({
    ok: true,
    mode: body.sendEmail ? mode : "mock",
    emailed: Boolean(body.sendEmail && enabledRecipients.length > 0),
    filename,
    fileBase64: buffer.toString("base64"),
    recipientCount: enabledRecipients.length,
  });
}

function classSummaryTable(payload: DigestPayload) {
  const lines = payload.summaries
    .map(
      (item) =>
        `<tr><td>${item.classLabel}</td><td>${item.teacher}</td><td>${item.absent}</td><td>${item.late}</td><td>${item.leave}</td><td>${item.pending}</td></tr>`
    )
    .join("");
  return `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr>
          <th>班別</th><th>班主任</th><th>缺席</th><th>遲到</th><th>請假</th><th>待審核</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
  `;
}

function studentDetailTable(payload: DigestPayload) {
  if (payload.rows.length === 0) {
    return `<p>該日全校沒有缺席、遲到或請假紀錄。</p>`;
  }
  const lines = payload.rows
    .map((row) => {
      const bg = row.eclassStatus === "遲到" ? " style=\"background:#f1f5f9\"" : "";
      return `<tr${bg}><td>${row.classLabel}</td><td>${row.studentNo}</td><td>${row.name} ${row.nameEn}</td><td>${row.eclassStatus}</td><td>${row.reason}</td></tr>`;
    })
    .join("");
  return `
    <p><strong>當日個別學生明細（缺席／遲到／請假及原因）：</strong></p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th>班別</th><th>學號</th><th>姓名</th><th>狀態</th><th>原因</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
  `;
}

function emailHtml(
  payload: DigestPayload,
  recipients: Array<{ name: string; email: string }>
) {
  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${payload.schoolDay} 上課日之<strong>全校各班缺席名單</strong>（Excel）。資料已由 eClass 點名自動整合。</p>
    ${classSummaryTable(payload)}
    <p style="margin-top:16px"></p>
    ${studentDetailTable(payload)}
    <p>請班主任核對本班名單；校務處請跟進醫生證明／家長信審核。獲批請假不計入出席率及缺席上限。</p>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
