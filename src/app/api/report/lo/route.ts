import { NextResponse } from "next/server";
import { formatShortDate } from "@/lib/format";
import { reportSendPayload, sendMail } from "@/lib/mailer";
import { buildLoWorkbook } from "@/lib/excel-lo";
import type { LoReportPayload } from "@/lib/lo-report";
import { SCHOOL_NAME } from "@/lib/seed";
import { isSiteRequestAuthorized } from "@/lib/site-auth";
import { formLabel } from "@/lib/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SendBody {
  payload: LoReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return NextResponse.json({ error: "未獲授權。" }, { status: 401 });
  }
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.weekStart || !Array.isArray(body.payload.days) || body.payload.days.length === 0) {
    return NextResponse.json({ error: "缺少羅小姐報告資料。" }, { status: 400 });
  }

  const filename = body.payload.filename || `Daily Attendance Report (羅小姐) ${body.payload.weekLabel}.xlsx`;
  const buffer = await buildLoWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  if (body.sendEmail) {
    try {
      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】${filename.replace(/\.xlsx$/, "")}`,
        html: loEmailHtml(body.payload, enabledRecipients),
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

  return NextResponse.json(
    reportSendPayload({
      sendEmail: body.sendEmail,
      filename,
      buffer,
      recipientCount: enabledRecipients.length,
    })
  );
}

function loEmailHtml(
  payload: LoReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const dayRows = payload.days
    .map((day) => {
      const forms = day.forms
        .map((item) => `${formLabel(item.form)} ${item.present}/${item.registered}`)
        .join("　");
      return `<tr>
        <td>${formatShortDate(day.date)} ${day.weekdayLabel}</td>
        <td>${forms}</td>
        <td>${day.totalPresent}/${day.totalRegistered}</td>
        <td>${(day.totalAttendanceRate * 100).toFixed(1)}%</td>
        <td>${day.totalAbsent}</td>
      </tr>`;
    })
    .join("");

  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${formatShortDate(payload.weekStart)} 至 ${formatShortDate(payload.weekEnd)} 之<strong>羅小姐報告</strong>（Daily Attendance Record，Excel，只含萬鈞伯裘）。</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th>日期</th>
          <th>各級出席／註冊</th>
          <th>全校</th>
          <th>出席率</th>
          <th>缺席</th>
        </tr>
      </thead>
      <tbody>${dayRows}</tbody>
    </table>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
