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
  const excelPromise = buildDailySchoolWorkbook(body.payload);
  const enabledRecipients = (body.recipients ?? []).filter((item) => item.email);

  let pdfAttached = false;
  let warning: string | undefined;

  if (body.sendEmail) {
    try {
      const [excelBuffer, pdfResult] = await Promise.all([
        excelPromise,
        buildDailySchoolPdf(body.payload)
          .then((buffer) => ({ ok: true as const, buffer }))
          .catch((error) => ({ ok: false as const, error })),
      ]);

      const attachments: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
      }> = [
        {
          filename: excelFilename,
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ];

      let html = "<p>附上每日缺席報告（Excel 及 PDF），請看附件，謝謝。</p>";

      if (pdfResult.ok) {
        attachments.push({
          filename: pdfFilename,
          content: pdfResult.buffer,
          contentType: "application/pdf",
        });
        pdfAttached = true;
      } else {
        console.error("[daily-report] PDF generation failed:", pdfResult.error);
        warning =
          pdfResult.error instanceof Error
            ? `PDF 未能產生（${pdfResult.error.message}），已改為只附 Excel。`
            : "PDF 未能產生，已改為只附 Excel。";
        html = "<p>附上每日缺席報告 Excel，請看附件，謝謝。</p>";
      }

      await sendMail({
        fromName: `${SCHOOL_NAME}校務處`,
        subject: `【${SCHOOL_NAME}】${body.payload.schoolDay} 每日缺席報告`,
        html,
        recipients: enabledRecipients,
        attachments,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "無法寄出電郵。" },
        { status: 503 }
      );
    }
  }

  const excelBuffer = await excelPromise;

  return NextResponse.json({
    ...reportSendPayload({
      sendEmail: body.sendEmail,
      filename: excelFilename,
      buffer: excelBuffer,
      recipientCount: enabledRecipients.length,
    }),
    pdfAttached,
    warning,
  });
}
