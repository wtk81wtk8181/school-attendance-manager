import { NextResponse } from "next/server";
import { reportSendPayload, sendMail } from "@/lib/mailer";
import { buildDailySchoolWorkbook } from "@/lib/excel-daily";
import { buildDailySchoolPdf } from "@/lib/pdf-daily";
import type { DailySchoolReportPayload } from "@/lib/daily-report";
import { SCHOOL_NAME } from "@/lib/seed";
import { isSiteRequestAuthorized } from "@/lib/site-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const excelFilename = `每日缺席報告-${body.payload.schoolDay}.xlsx`;
  const pdfFilename = `每日缺席報告-${body.payload.schoolDay}.pdf`;
  const excelBuffer = await buildDailySchoolWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  if (body.sendEmail) {
    try {
      const pdfBuffer = await buildDailySchoolPdf(body.payload);
      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 每日缺席報告`,
        html: "<p>附上每日缺席報告（Excel 及 PDF），請看附件，謝謝。</p>",
        recipients: enabledRecipients,
        attachments: [
          {
            filename: excelFilename,
            content: excelBuffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
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
      filename: excelFilename,
      buffer: excelBuffer,
      recipientCount: enabledRecipients.length,
    })
  );
}
