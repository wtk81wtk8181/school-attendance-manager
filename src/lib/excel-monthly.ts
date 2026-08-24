import ExcelJS from "exceljs";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import type { MonthlyReportPayload } from "@/lib/monthly-report";

const NAVY = "1B365D";
const GOLD = "C4A35A";

const SUMMARY_HEADERS = [
  "班別",
  "班主任",
  "班人數",
  "上課日數（推算）",
  "缺席次數",
  "遲到次數",
  "請假人次",
  "計入缺席日數",
  "獲批請假日數",
  "待審核日數",
  "涉及缺席學生",
  "全班平均出席率",
];

const DETAIL_HEADERS = [
  "日期",
  "班別",
  "學號",
  "姓名",
  "英文名",
  "班主任",
  "狀態",
  "日數",
  "原因",
  "文件類型",
  "是否提交",
  "審核狀態",
  "計入缺席",
];

export async function buildMonthlyWorkbook(
  payload: MonthlyReportPayload
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  addSummarySheet(workbook, payload);
  addDetailSheet(workbook, payload);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addSummarySheet(workbook: ExcelJS.Workbook, payload: MonthlyReportPayload) {
  const sheet = workbook.addWorksheet("各班缺席率", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  sheet.mergeCells("A1:L1");
  sheet.getCell("A1").value = `${SCHOOL_NAME}　${SCHOOL_NAME_EN}`;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: `FF${NAVY}` } };

  sheet.mergeCells("A2:L2");
  sheet.getCell("A2").value = `每月各班缺席率報告　${payload.monthLabel}`;
  sheet.getCell("A2").font = { size: 12, color: { argb: `FF${NAVY}` } };

  sheet.mergeCells("A3:L3");
  sheet.getCell("A3").value =
    "出席率＝（當月上課日−計入缺席日）÷ 當月上課日。獲批請假（醫生證明／家長信）不計入；遲到另行統計次數。";
  sheet.getCell("A3").font = { size: 10, italic: true, color: { argb: "FF5C6570" } };

  const headerRow = sheet.addRow(SUMMARY_HEADERS);
  styleHeader(headerRow);

  for (const item of payload.classes) {
    sheet.addRow([
      item.classLabel,
      item.teacher,
      item.studentCount,
      item.schoolDaysInMonth,
      item.absentCount,
      item.lateCount,
      item.leaveCount,
      item.countedAbsenceDays,
      item.approvedLeaveDays,
      item.pendingDays,
      item.studentsWithAbsence,
      Number(item.attendanceRate.toFixed(1)) + "%",
    ]);
  }

  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 10 },
    { width: 16 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 13 },
    { width: 13 },
    { width: 12 },
    { width: 13 },
    { width: 15 },
  ];
  if (payload.classes.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + payload.classes.length, column: SUMMARY_HEADERS.length },
    };
  }
}

function addDetailSheet(workbook: ExcelJS.Workbook, payload: MonthlyReportPayload) {
  const sheet = workbook.addWorksheet("缺席請假明細", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const headerRow = sheet.addRow(DETAIL_HEADERS);
  styleHeader(headerRow);

  if (payload.rows.length === 0) {
    const empty = sheet.addRow([`${payload.monthLabel}沒有缺席、遲到或請假紀錄。`]);
    sheet.mergeCells(`A2:M2`);
    empty.font = { italic: true, color: { argb: "FF5C6570" } };
  } else {
    for (const row of payload.rows) {
      sheet.addRow([
        row.date,
        row.classLabel,
        row.studentNo,
        row.name,
        row.nameEn,
        row.teacher,
        row.status,
        row.days,
        row.reason,
        row.documentType,
        row.documentSubmitted,
        row.reviewStatus,
        row.counted,
      ]);
    }
  }

  sheet.columns = [
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 18 },
    { width: 12 },
    { width: 10 },
    { width: 8 },
    { width: 22 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
  if (payload.rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1 + payload.rows.length, column: DETAIL_HEADERS.length },
    };
  }
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${NAVY}` },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: `FF${GOLD}` } },
    };
  });
  row.height = 22;
}
