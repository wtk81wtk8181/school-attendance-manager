import { NextResponse } from "next/server";
import { formatDate } from "@/lib/format";
import { sendMail } from "@/lib/mailer";
import type { DailyReportPayload } from "@/lib/daily-report";
import { SCHOOL_NAME } from "@/lib/seed";

interface SendBody {
  payload: DailyReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.schoolDay) {
    return NextResponse.json({ error: "缺少上課日資料。" }, { status: 400 });
  }

  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);
  let mode: "smtp" | "mock" = "mock";

  if (body.sendEmail && enabledRecipients.length > 0) {
    mode = await sendMail({
      fromName: `${SCHOOL_NAME}校務處`,
      subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 每日缺席報告`,
      html: dailyEmailHtml(body.payload, enabledRecipients),
      recipients: enabledRecipients,
    });
  }

  return NextResponse.json({
    ok: true,
    mode: body.sendEmail ? mode : "mock",
    emailed: Boolean(body.sendEmail && enabledRecipients.length > 0),
    recipientCount: enabledRecipients.length,
  });
}

function dailyEmailHtml(
  payload: DailyReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const absentCount = payload.rows.filter((item) => item.status === "缺席").length;
  const leaveCount = payload.rows.filter((item) => item.status === "請假").length;

  const table =
    payload.rows.length === 0
      ? `<p>該日沒有缺席或請假紀錄。</p>`
      : `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th>班別</th>
          <th>學生姓名</th>
          <th>請假／缺席原因</th>
          <th>致電到校人士</th>
          <th>致電時間</th>
        </tr>
      </thead>
      <tbody>
        ${payload.rows
          .map(
            (row) =>
              `<tr>
                <td>${row.classLabel}</td>
                <td>${row.name}<br/><span style="color:#666;font-size:12px">${row.studentNo}　${row.status}${row.days === 0.5 ? "（半日）" : ""}</span></td>
                <td>${row.reason}</td>
                <td>${row.calledBy}</td>
                <td>${row.calledAt}</td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  return `
    <p>各位同事：</p>
    <p>以下為 <strong>${SCHOOL_NAME}</strong> ${formatDate(payload.schoolDay)}（${payload.scope}）之<strong>每日缺席報告</strong>，包括請假原因、致電到校人士及致電時間。</p>
    ${table}
    <p style="margin-top:12px">缺席 ${absentCount} 人、請假 ${leaveCount} 人，合計 ${payload.rows.length} 人。</p>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
