import ExcelJS from "exceljs";
import { SCHOOL_NAME } from "@/lib/seed";
import type { DailyClassBlock, DailySchoolReportPayload } from "@/lib/daily-report";

const THIN: ExcelJS.BorderStyle = "thin";
const BLACK = { argb: "FF000000" };
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E2F3" },
};
const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1B365D" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: THIN, color: BLACK },
  left: { style: THIN, color: BLACK },
  right: { style: THIN, color: BLACK },
  bottom: { style: THIN, color: BLACK },
};

const ROWS_PER_CLASS = 5;
const CLASS_START_ROW = 5;
const LEFT_COLS = { class: 1, cap: 2, present: 3, early: 4, absences: 5, absencesEnd: 10, enroll: 11, withdraw: 12 };
const RIGHT_COLS = { class: 13, cap: 14, present: 15, early: 16, absences: 17, absencesEnd: 22, enroll: 23, withdraw: 24 };
const FORM_COLS = [
  { start: 17, end: 20 },
  { start: 21, end: 24 },
  { start: 25, end: 28 },
  { start: 29, end: 32 },
  { start: 33, end: 36 },
  { start: 37, end: 40 },
];
const TOTAL_START = 41;
const TOTAL_END = 47;
const CLASS_CODE_START = 16;

export async function buildDailySchoolWorkbook(
  payload: DailySchoolReportPayload
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("每日缺席報告", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: true,
      printArea: "A1:AU90",
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.3,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  for (let col = 1; col <= 47; col += 1) {
    sheet.getColumn(col).width = col <= 24 ? 7.2 : 4.2;
  }
  sheet.getColumn(5).width = 11;
  sheet.getColumn(17).width = 11;

  writeTitle(sheet, payload);
  writeClassHeaders(sheet);
  writeClassBlocks(sheet, payload.classes.slice(0, 15), LEFT_COLS, CLASS_START_ROW);
  writeClassBlocks(sheet, payload.classes.slice(15, 30), RIGHT_COLS, CLASS_START_ROW);
  writeStaffFooter(sheet, payload);
  writeStatsFooter(sheet, payload);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function writeTitle(sheet: ExcelJS.Worksheet, payload: DailySchoolReportPayload) {
  mergeValue(sheet, 1, 1, 1, 47, `${SCHOOL_NAME}　學生缺席每日報告表`, {
    font: { bold: true, size: 16, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: TITLE_FILL,
  });
  sheet.getRow(1).height = 24;

  mergeValue(sheet, 2, 1, 2, 47, payload.dateLabel, {
    font: { bold: true, size: 12 },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  sheet.getRow(2).height = 18;

  mergeValue(sheet, 3, 1, 3, 12, "中一至中三", {
    font: { bold: true, size: 11 },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
  });
  mergeValue(sheet, 3, 13, 3, 24, "中四至中六", {
    font: { bold: true, size: 11 },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
  });
}

function writeClassHeaders(sheet: ExcelJS.Worksheet) {
  const headers: Array<[number, number, string]> = [
    [1, 1, "班別代碼"],
    [2, 2, "課室容額"],
    [3, 3, "出席"],
    [4, 4, "早退"],
    [5, 10, "缺席名單及原因"],
    [11, 11, "新生插班名單"],
    [12, 12, "退學名單"],
    [13, 13, "班別代碼"],
    [14, 14, "課室容額"],
    [15, 15, "出席"],
    [16, 16, "早退"],
    [17, 22, "缺席名單及原因"],
    [23, 23, "新生插班名單"],
    [24, 24, "退學名單"],
  ];
  for (const [start, end, text] of headers) {
    mergeValue(sheet, 4, start, 4, end, text, {
      font: { bold: true, size: 9 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      fill: HEADER_FILL,
    });
  }
  sheet.getRow(4).height = 28;
}

function writeClassBlocks(
  sheet: ExcelJS.Worksheet,
  blocks: DailyClassBlock[],
  cols: typeof LEFT_COLS,
  startRow: number
) {
  blocks.forEach((block, index) => {
    const row = startRow + index * ROWS_PER_CLASS;
    const end = row + ROWS_PER_CLASS - 1;
    const center = {
      font: { size: 9 },
      alignment: { horizontal: "center" as const, vertical: "middle" as const, wrapText: true },
    };
    mergeValue(sheet, row, cols.class, end, cols.class, block.className, {
      ...center,
      font: { bold: true, size: 10 },
    });
    mergeValue(sheet, row, cols.cap, end, cols.cap, block.registered || "", center);
    mergeValue(sheet, row, cols.present, end, cols.present, block.present, center);
    mergeValue(sheet, row, cols.early, end, cols.early, block.earlyLeave || "", center);
    mergeValue(
      sheet,
      row,
      cols.absences,
      end,
      cols.absencesEnd,
      block.absenceLines.join("\n"),
      {
        font: { size: 8 },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
      }
    );
    mergeValue(sheet, row, cols.enroll, end, cols.enroll, "", center);
    mergeValue(sheet, row, cols.withdraw, end, cols.withdraw, "", center);
    for (let r = row; r <= end; r += 1) {
      sheet.getRow(r).height = 15;
    }
  });
}

function writeStaffFooter(sheet: ExcelJS.Worksheet, payload: DailySchoolReportPayload) {
  mergeValue(sheet, 81, 1, 81, 12, "教職員缺席情況：", {
    font: { bold: true, size: 10 },
    alignment: { vertical: "middle" },
  });
  const rows: Array<[number, string, string[]]> = [
    [83, "病假：", payload.staff.sick],
    [85, "事假：", payload.staff.personal],
    [87, "公假：", payload.staff.official],
    [89, "早退：", payload.staff.early],
  ];
  for (const [row, label, names] of rows) {
    mergeValue(sheet, row, 1, row, 2, label, {
      font: { bold: true, size: 9 },
      alignment: { vertical: "middle" },
    });
    mergeValue(sheet, row, 3, row, 12, names.join("、"), {
      font: { size: 9 },
      alignment: { vertical: "middle", wrapText: true },
    });
    sheet.getRow(row).height = 18;
  }
}

function writeStatsFooter(sheet: ExcelJS.Worksheet, payload: DailySchoolReportPayload) {
  mergeValue(sheet, 81, 13, 81, 16, "級別", headerStyle());
  payload.formStats.forEach((stat, index) => {
    const cols = FORM_COLS[index];
    mergeValue(sheet, 81, cols.start, 81, cols.end, stat.label, headerStyle());
  });
  mergeValue(sheet, 81, TOTAL_START, 81, TOTAL_END, "總數", headerStyle());

  writeFormMetric(sheet, 82, "學生出席人數 :", payload.formStats.map((item) => item.present), payload.totalPresent, false);
  writeFormMetric(sheet, 83, "學生註冊人數 :", payload.formStats.map((item) => item.registered), payload.totalRegistered, false);
  writeFormMetric(
    sheet,
    84,
    "學生出席百分比% :",
    payload.formStats.map((item) => item.attendanceRate),
    payload.totalAttendanceRate,
    true
  );

  mergeValue(sheet, 86, 13, 86, 15, "", headerStyle());
  payload.classes.forEach((block, index) => {
    const col = CLASS_CODE_START + index;
    mergeValue(sheet, 86, col, 86, col, block.className, headerStyle(8));
  });
  mergeValue(sheet, 86, 46, 86, 47, "TOTAL", headerStyle());

  mergeValue(sheet, 88, 13, 88, 15, "出席百分比 :", labelStyle());
  payload.classes.forEach((block, index) => {
    const col = CLASS_CODE_START + index;
    mergeValue(sheet, 87, col, 87, col, block.absentCount || "", centerStyle());
    mergeValue(sheet, 88, col, 88, col, block.attendanceRate, {
      ...centerStyle(),
      numFmt: "0.00%",
    });
  });
  mergeValue(sheet, 87, 46, 87, 47, payload.totalAbsent, centerStyle());
  mergeValue(sheet, 88, 46, 88, 47, payload.totalAttendanceRate, {
    ...centerStyle(),
    numFmt: "0.00%",
  });

  mergeValue(sheet, 89, 13, 89, 15, "學生遲到人數：", labelStyle());
  mergeValue(sheet, 90, 13, 90, 15, "守時百分比 :", labelStyle());
  payload.classes.forEach((block, index) => {
    const col = CLASS_CODE_START + index;
    mergeValue(sheet, 89, col, 89, col, block.lateCount || 0, centerStyle());
    mergeValue(sheet, 90, col, 90, col, block.punctualityRate, {
      ...centerStyle(),
      numFmt: "0.00%",
    });
  });
  mergeValue(sheet, 89, 46, 89, 47, payload.totalLate, centerStyle());
  mergeValue(sheet, 90, 46, 90, 47, payload.schoolPunctualityRate, {
    ...centerStyle(),
    numFmt: "0.00%",
  });
}

function writeFormMetric(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  values: number[],
  total: number,
  percent: boolean
) {
  mergeValue(sheet, row, 13, row, 16, label, labelStyle());
  values.forEach((value, index) => {
    const cols = FORM_COLS[index];
    mergeValue(sheet, row, cols.start, row, cols.end, value, {
      ...centerStyle(),
      numFmt: percent ? "0.00%" : undefined,
    });
  });
  mergeValue(sheet, row, TOTAL_START, row, TOTAL_END, total, {
    ...centerStyle(),
    font: { bold: true, size: 9 },
    numFmt: percent ? "0.00%" : undefined,
  });
}

function headerStyle(size = 9): CellStyle {
  return {
    font: { bold: true, size },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    fill: HEADER_FILL,
  };
}

function labelStyle(): CellStyle {
  return {
    font: { size: 8 },
    alignment: { horizontal: "right", vertical: "middle", wrapText: true },
  };
}

function centerStyle(): CellStyle {
  return {
    font: { size: 8 },
    alignment: { horizontal: "center", vertical: "middle" },
  };
}

interface CellStyle {
  font?: Partial<ExcelJS.Font>;
  alignment?: Partial<ExcelJS.Alignment>;
  fill?: ExcelJS.Fill;
  numFmt?: string;
}

function mergeValue(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  value: ExcelJS.CellValue,
  style: CellStyle = {}
) {
  if (startRow !== endRow || startCol !== endCol) {
    sheet.mergeCells(startRow, startCol, endRow, endCol);
  }
  const origin = sheet.getCell(startRow, startCol);
  origin.value = value;
  if (style.numFmt) origin.numFmt = style.numFmt;
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.border = THIN_BORDER;
      if (style.font) cell.font = style.font;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.fill) cell.fill = style.fill;
    }
  }
}
