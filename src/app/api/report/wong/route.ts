import { NextResponse } from "next/server";
import { buildWongWorkbook } from "@/lib/excel-wong";
import { SCHOOL_NAME } from "@/lib/seed";
import { reportSendPayload, sendMail } from "@/lib/mailer";
import { isSiteRequestAuthorized } from "@/lib/site-auth";
import type { WongReportPayload } from "@/lib/wong-report";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SendBody {
  payload: WongReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

export async function POST(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return NextResponse.json({ error: "未獲授權。" }, { status: 401 });
  }
  const body = (await request.json()) as SendBody;
  if (!body?.payload?.yearMonth || !Array.isArray(body.payload.classes)) {
    return NextResponse.json({ error: "缺少黃sir每月報告資料。" }, { status: 400 });
  }

  const filename = `黃sir每月報告-${body.payload.yearMonth}.xlsx`;
  const buffer = await buildWongWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  if (body.sendEmail) {
    try {
      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】${body.payload.monthLabel} 黃sir每月報告`,
        html: wongEmailHtml(body.payload, enabledRecipients),
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

function wongEmailHtml(
  payload: WongReportPayload,
  recipients: Array<{ name: string; email: string }>
) {
  return `
    <p>各位同事：</p>
    <p>附件為 <strong>${SCHOOL_NAME}</strong> ${payload.monthLabel}之<strong>黃sir每月報告</strong>（Excel，按班列出每生計入缺席日數、未有醫生紙及遲到次數）。</p>
    <p>全校共 ${payload.totals.studentCount} 人；有缺席／缺醫生紙／遲到紀錄 ${payload.totals.studentsWithIssues} 人；未有醫生紙 ${payload.totals.missingDoctorCount} 人（Excel 以黃色標示）。</p>
    <p>此郵件已發送至：${recipients.map((item) => `${item.name} &lt;${item.email}&gt;`).join("、")}。</p>
    <p>${SCHOOL_NAME}校務處</p>
  `;
}
