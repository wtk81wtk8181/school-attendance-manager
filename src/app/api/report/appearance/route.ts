import { NextResponse } from "next/server";
import { buildAppearanceWorkbook } from "@/lib/excel-appearance";
import { SCHOOL_NAME } from "@/lib/seed";
import { sendMail } from "@/lib/mailer";
import type { AppearanceReportPayload } from "@/lib/appearance-report";
import { isSiteRequestAuthorized } from "@/lib/site-auth";

interface SendBody {
  payload: AppearanceReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return NextResponse.json({ error: "未獲授權。" }, { status: 401 });
  }
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.yearMonth || !Array.isArray(body.payload.classes)) {
    return NextResponse.json({ error: "缺少儀容百分率報告資料。" }, { status: 400 });
  }

  const filename = `各班出席表現及儀容百份比報告-${body.payload.yearMonth}.xlsx`;
  const buffer = await buildAppearanceWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  if (body.sendEmail) {
    try {
      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】（${body.payload.monthLabel}）各班出席表現及儀容百份比報告`,
        html: appearanceEmailHtml(body.payload, enabledRecipients),
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

function appearanceEmailHtml(
  payload: AppearanceReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  const lines = payload.classes
    .map((item) => {
      const appearance =
        item.appearanceRate === null ? "—" : `${(item.appearanceRate * 100).toFixed(2)}%`;
      return `<tr><td>${item.className}</td><td>${(item.punctualityRate * 100).toFixed(2)}%</td><td>${(item.attendanceRate * 100).toFixed(2)}%</td><td>${appearance}</td></tr>`;
    })
    .join("");

  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong>（${payload.monthLabel}）<strong>各班出席表現及儀容百份比報告</strong>。</p>
    <p>出席百分率及守時百分率由系統按該月缺席／遲到計算；校服儀容百分率於平台輸入。</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr><th>班別</th><th>守時百分率</th><th>出席百分率</th><th>校服儀容百分率</th></tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
