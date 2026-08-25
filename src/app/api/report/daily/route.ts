import { NextResponse } from "next/server";
import { formatDate, formatPercentExact } from "@/lib/format";
import { sendMail } from "@/lib/mailer";
import { buildDailySchoolWorkbook } from "@/lib/excel-daily";
import { STAFF_ABSENCE_ROWS } from "@/lib/staff";
import type { DailySchoolReportPayload } from "@/lib/daily-report";
import { SCHOOL_NAME } from "@/lib/seed";
import { isSiteRequestAuthorized } from "@/lib/site-auth";

interface SendBody {
  payload: DailySchoolReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return NextResponse.json({ error: "未獲授權。" }, { status: 401 });
  }
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.schoolDay || !Array.isArray(body.payload.classes)) {
    return NextResponse.json({ error: "缺少每日缺席報告資料。" }, { status: 400 });
  }

  const filename = `每日缺席報告-${body.payload.schoolDay}.xlsx`;
  const buffer = await buildDailySchoolWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  if (body.sendEmail) {
    try {
      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 每日缺席報告`,
        html: dailyEmailHtml(body.payload, enabledRecipients),
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
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "無法寄出電郵。" },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    mode: body.sendEmail ? "smtp" : "export",
    emailed: Boolean(body.sendEmail && enabledRecipients.length > 0),
    filename,
    fileBase64: buffer.toString("base64"),
    recipientCount: enabledRecipients.length,
  });
}

function dailyEmailHtml(
  payload: DailySchoolReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const formCells = payload.formStats
    .map((item) => `<td>${item.label}<br/>${formatPercentExact(item.attendanceRate)}</td>`)
    .join("");
  const staffHtml = STAFF_ABSENCE_ROWS.map((row) => {
    const names = payload.staff[row.kind];
    return `<p><strong>${row.label}：</strong>${names.length > 0 ? names.join("、") : "—"}</p>`;
  }).join("");
  const staffLeaveHtml =
    payload.staffLeaveLines && payload.staffLeaveLines.length > 0
      ? `<p><strong>提早登記請假：</strong></p><ul>${payload.staffLeaveLines
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul>`
      : "";
  const studentLeaveHtml =
    payload.studentLeaveLines && payload.studentLeaveLines.length > 0
      ? `<p><strong>學生預先請假：</strong></p><ul>${payload.studentLeaveLines
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul>`
      : "";

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
          .filter((row) => row.statusKey !== "late")
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
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${formatDate(payload.schoolDay)} 之<strong>學生缺席每日報告表</strong>（Excel，含各班出席、缺席名單、年級百分比及守時百分比）。</p>
    <p>全校出席 ${payload.totalPresent}／${payload.totalRegistered}（${formatPercentExact(payload.totalAttendanceRate)}）；缺席或請假 ${payload.totalAbsent} 人；遲到 ${payload.totalLate} 人；守時百分比 ${formatPercentExact(payload.schoolPunctualityRate)}。</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:12px 0">
      <tr><th>級別出席率</th>${formCells}<td>總數<br/>${formatPercentExact(payload.totalAttendanceRate)}</td></tr>
    </table>
    <p><strong>教職員缺席情況</strong></p>
    ${staffHtml}
    ${staffLeaveHtml}
    ${studentLeaveHtml}
    ${table}
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
