import ExcelJS from "exceljs";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import type { DigestPayload } from "@/lib/digest";

const NAVY = "1B365D";
const GOLD = "C4A35A";

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

export async function buildAbsenceWorkbook(payload: DigestPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  addSummarySheet(workbook, payload);
  addDetailSheet(workbook, "全校缺席名單", payload.rows);
  for (const summary of payload.summaries) {
    const rows = payload.rows.filter((row) => row.className === summary.className);
    addDetailSheet(workbook, summary.classLabel, rows, summary);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addSummarySheet(workbook: ExcelJS.Workbook, payload: DigestPayload) {
  const sheet = workbook.addWorksheet("各班總覽", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  sheet.mergeCells("A1:I1");
  sheet.getCell("A1").value = `${SCHOOL_NAME}　${SCHOOL_NAME_EN}`;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: `FF${NAVY}` } };

  sheet.mergeCells("A2:I2");
  sheet.getCell("A2").value = `每日全校缺席名單　上課日 ${payload.schoolDay}`;
  sheet.getCell("A2").font = { size: 12, color: { argb: `FF${NAVY}` } };

  sheet.mergeCells("A3:I3");
  sheet.getCell("A3").value =
    "資料來源：校務處於本平台登記。獲批請假不計入出席率及缺席上限。";
  sheet.getCell("A3").font = { size: 10, italic: true, color: { argb: "FF5C6570" } };

  const headers = [
    "班別",
    "班主任",
    "班人數",
    "當日出席（推算）",
    "缺席人數",
    "遲到人數",
    "請假人數",
    "待審核",
    "計入缺席",
  ];
  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  for (const summary of payload.summaries) {
    sheet.addRow([
      summary.classLabel,
      summary.teacher,
      summary.studentCount,
      summary.presentImplied,
      summary.absent,
      summary.late,
      summary.leave,
      summary.pending,
      summary.counted,
    ]);
  }

  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + payload.summaries.length, column: headers.length },
  };
}

function addDetailSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: DigestPayload["rows"],
  summary?: DigestPayload["summaries"][number]
) {
  const sheet = workbook.addWorksheet(safeSheetName(name), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const headerRow = sheet.addRow(DETAIL_HEADERS);
  styleHeader(headerRow);

  if (rows.length === 0) {
    const empty = sheet.addRow([
      summary ? `${summary.classLabel}當日全班出席，沒有缺席或請假。` : "當日沒有缺席或請假紀錄。",
    ]);
    sheet.mergeCells(`A2:M2`);
    empty.font = { italic: true, color: { argb: "FF5C6570" } };
  } else {
    for (const row of rows) {
      sheet.addRow([
        row.date,
        row.classLabel,
        row.studentNo,
        row.name,
        row.nameEn,
        row.teacher,
        row.eclassStatus,
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
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1 + rows.length, column: DETAIL_HEADERS.length },
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

function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}
