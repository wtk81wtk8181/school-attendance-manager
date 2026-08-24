import { NextResponse } from "next/server";
import { FREQUENT_LIMIT } from "@/lib/rules";
import { SCHOOL_NAME } from "@/lib/seed";
import { sendMail } from "@/lib/mailer";
import type { WarningType } from "@/lib/types";

interface WarningNotice {
  type: WarningType;
  triggerDays: number;
  limitDays: number;
}

interface StudentNotice {
  name: string;
  nameEn: string;
  className: string;
  teacher: string;
  countedAbsenceDays: number;
  absentCount: number;
  lateCount: number;
  frequentCount: number;
}

interface SendBody {
  warnings: WarningNotice[];
  student: StudentNotice;
  recipients: Array<{ name: string; email: string }>;
}

const typeLabels: Record<WarningType, string> = {
  half_limit: "缺席預警（達上限一半）",
  over_limit: "缺席已達／超過上限",
  frequent: `缺席／遲到合計超過 ${FREQUENT_LIMIT} 次`,
};

export async function POST(request: Request) {
  const body = (await request.json()) as SendBody;
  if (!body?.student?.name || !Array.isArray(body.warnings)) {
    return NextResponse.json({ error: "缺少警告資料。" }, { status: 400 });
  }

  const recipients = (body.recipients ?? []).filter((item) => item.email);
  const mode = await sendMail({
    fromName: `${SCHOOL_NAME}校務處`,
    subject: `【${SCHOOL_NAME}】出席警告通知：${body.student.name}（${body.student.className}）`,
    html: warningEmailHtml(body),
    recipients,
  });

  return NextResponse.json({
    ok: true,
    mode,
    emailed: mode === "smtp",
    recipientCount: recipients.length,
  });
}

function warningEmailHtml(body: SendBody): string {
  const { student } = body;
  const rows = body.warnings
    .map(
      (item) =>
        `<li>${typeLabels[item.type]}：${
          item.type === "frequent"
            ? `合計 ${item.triggerDays} 次`
            : `${item.triggerDays} 天 / 上限 ${item.limitDays} 天`
        }</li>`
    )
    .join("");

  return `
    <p>各位同事：</p>
    <p><strong>${SCHOOL_NAME}</strong> 出勤預警系統剛發出以下警告信，請跟進：</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <tbody>
        <tr><td>學生</td><td>${student.name} ${student.nameEn}</td></tr>
        <tr><td>班別</td><td>${student.className}（班主任：${student.teacher}）</td></tr>
        <tr><td>計入缺席</td><td>${student.countedAbsenceDays} 天</td></tr>
        <tr><td>缺席次數</td><td>${student.absentCount} 次</td></tr>
        <tr><td>遲到次數</td><td>${student.lateCount} 次</td></tr>
        <tr><td>缺席＋遲到合計</td><td>${student.frequentCount} 次</td></tr>
        <tr><td>觸發警告</td><td><ul style="margin:0;padding-left:18px">${rows}</ul></td></tr>
      </tbody>
    </table>
    <p>請於平台「警告信」頁面檢視及列印警告信，並登記跟進。</p>
    <p>${SCHOOL_NAME}校務處（此為系統自動通知）</p>
  `;
}
