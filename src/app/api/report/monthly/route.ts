import { NextResponse } from "next/server";
import { buildMonthlyWorkbook } from "@/lib/excel-monthly";
import { SCHOOL_NAME } from "@/lib/seed";
import { sendMail } from "@/lib/mailer";
import type { MonthlyReportPayload } from "@/lib/monthly-report";

interface SendBody {
  payload: MonthlyReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.yearMonth || !Array.isArray(body.payload.classes)) {
    return NextResponse.json({ error: "缺少月份報告資料。" }, { status: 400 });
  }

  const filename = `每月各班缺席率報告-${body.payload.yearMonth}.xlsx`;
  const buffer = await buildMonthlyWorkbook(body.payload);

  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);
  let mode: "smtp" | "mock" = "mock";

  if (body.sendEmail && enabledRecipients.length > 0) {
    mode = await sendMail({
      fromName: `${SCHOOL_NAME}校務處`,
      subject: `【${SCHOOL_NAME}】${body.payload.monthLabel} 每月各班缺席率報告`,
      html: monthlyEmailHtml(body.payload, enabledRecipients),
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

function monthlyEmailHtml(
  payload: MonthlyReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const lines = payload.classes
    .map(
      (item) =>
        `<tr><td>${item.classLabel}</td><td>${item.teacher}</td><td>${item.studentCount}</td><td>${item.absentCount}</td><td>${item.lateCount}</td><td>${item.leaveCount}</td><td>${item.countedAbsenceDays}</td><td>${item.attendanceRate.toFixed(1)}%</td></tr>`
    )
    .join("");

  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${payload.monthLabel}之<strong>每月各班缺席率報告</strong>（Excel，含各班統計及逐日明細）。</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr>
          <th>班別</th><th>班主任</th><th>人數</th><th>缺席</th><th>遲到</th><th>請假</th><th>計入缺席（天）</th><th>平均出席率</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
    <p>獲批請假不計入出席率；遲到另行統計。學生缺席＋遲到超過 3 次者，系統會自動發出警告信並電郵通知。</p>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
