import ExcelJS from "exceljs";
import {
  absenceColRanges,
  excelAbsenceLayout,
} from "@/lib/daily-absence-display";
import { SCHOOL_NAME } from "@/lib/seed";
import {
  formatDailyAbsenceLine,
  type DailyClassBlock,
  type DailySchoolReportPayload,
} from "@/lib/daily-report";

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


const CLASS_START_ROW = 5;
const LAST_COL = 24;
const LEFT_COLS = { class: 1, cap: 2, present: 3, early: 4, absences: 5, absencesEnd: 10, enroll: 11, withdraw: 12 };
const RIGHT_COLS = { class: 13, cap: 14, present: 15, early: 16, absences: 17, absencesEnd: 22, enroll: 23, withdraw: 24 };
const FORM_LABEL = { start: 1, end: 3 };
const FORM_COLS = [
  { start: 4, end: 6 },
  { start: 7, end: 9 },
  { start: 10, end: 12 },
  { start: 13, end: 15 },
  { start: 16, end: 18 },
  { start: 19, end: 21 },
];
const FORM_TOTAL = { start: 22, end: 24 };
const CLASS_LABEL_END = 2;
const CLASS_CODE_START = 3;
const CLASS_TOTAL_START = 18;
const CLASS_TOTAL_END = 24;
const JUNIOR_SPLIT = 8;

export async function buildDailySchoolWorkbook(
  payload: DailySchoolReportPayload
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const junior = payload.classes.slice(0, 15);
  const senior = payload.classes.slice(15, 30);

  const juniorSheet = createDailySheet(workbook, "中一至中三");
  setupColumns(juniorSheet);
  writeTitle(juniorSheet, payload, "中一至中三");
  writeClassHeaders(juniorSheet);
  const juniorLeft = junior.slice(0, JUNIOR_SPLIT);
  const juniorRight = junior.slice(JUNIOR_SPLIT);
  writeClassBlocks(juniorSheet, juniorLeft, LEFT_COLS, CLASS_START_ROW, payload);
  writeClassBlocks(juniorSheet, juniorRight, RIGHT_COLS, CLASS_START_ROW, payload);
  const juniorFooterStart = Math.max(
    classSectionEndRow(CLASS_START_ROW, juniorLeft, payload),
    classSectionEndRow(CLASS_START_ROW, juniorRight, payload)
  );
  const juniorLastRow = writeStaffFooter(juniorSheet, payload, juniorFooterStart);
  juniorSheet.pageSetup.printArea = `A1:X${juniorLastRow}`;

  const seniorSheet = createDailySheet(workbook, "中四至中六");
  setupColumns(seniorSheet);
  writeTitle(seniorSheet, payload, "中四至中六");
  writeClassHeaders(seniorSheet);
  const seniorLeft = senior.slice(0, JUNIOR_SPLIT);
  const seniorRight = senior.slice(JUNIOR_SPLIT);
  writeClassBlocks(seniorSheet, seniorLeft, LEFT_COLS, CLASS_START_ROW, payload);
  writeClassBlocks(seniorSheet, seniorRight, RIGHT_COLS, CLASS_START_ROW, payload);
  const seniorFooterStart = Math.max(
    classSectionEndRow(CLASS_START_ROW, seniorLeft, payload),
    classSectionEndRow(CLASS_START_ROW, seniorRight, payload)
  );
  const seniorLastRow = writeStatsFooter(seniorSheet, payload, seniorFooterStart);
  seniorSheet.pageSetup.printArea = `A1:X${seniorLastRow}`;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createDailySheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  return workbook.addWorksheet(name, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: true,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.25,
        header: 0.15,
        footer: 0.15,
      },
    },
  });
}

function setupColumns(sheet: ExcelJS.Worksheet) {
  for (let col = 1; col <= LAST_COL; col += 1) {
    sheet.getColumn(col).width = 7.2;
  }
  sheet.getColumn(5).width = 11;
  sheet.getColumn(17).width = 11;
}

function classSectionEndRow(
  startRow: number,
  blocks: DailyClassBlock[],
  payload: DailySchoolReportPayload
): number {
  let row = startRow;
  for (const block of blocks) {
    row += excelAbsenceLayout(classAbsenceLines(block, payload)).rowSpan;
  }
  return row + 1;
}

function writeTitle(
  sheet: ExcelJS.Worksheet,
  payload: DailySchoolReportPayload,
  sectionLabel: string
) {
  mergeValue(sheet, 1, 1, 1, LAST_COL, `${SCHOOL_NAME}　學生缺席每日報告表`, {
    font: { bold: true, size: 16, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: TITLE_FILL,
  });
  sheet.getRow(1).height = 24;

  mergeValue(sheet, 2, 1, 2, LAST_COL, payload.dateLabel, {
    font: { bold: true, size: 12 },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  sheet.getRow(2).height = 18;

  mergeValue(sheet, 3, 1, 3, LAST_COL, sectionLabel, {
    font: { bold: true, size: 11 },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
  });
}

function writeClassHeaders(sheet: ExcelJS.Worksheet) {
  const headers: Array<[number, number, string]> = [
    [1, 1, "班別代碼"],
    [2, 2, "學生總人數"],
    [3, 3, "出席"],
    [4, 4, "早退"],
    [5, 10, "缺席名單及原因"],
    [11, 11, "新生插班名單"],
    [12, 12, "退學名單"],
    [13, 13, "班別代碼"],
    [14, 14, "學生總人數"],
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

function classAbsenceLines(
  block: DailyClassBlock,
  payload: DailySchoolReportPayload
): string[] {
  const classRows = (payload.rows ?? []).filter(
    (row) =>
      row.className === block.className &&
      (row.statusKey === "absent" ||
        row.statusKey === "leave" ||
        row.statusKey === "half_absent" ||
        row.statusKey === "early")
  );
  if (classRows.length > 0) {
    return classRows.map(formatDailyAbsenceLine);
  }
  return block.absenceLines ?? [];
}

function writeClassBlocks(
  sheet: ExcelJS.Worksheet,
  blocks: DailyClassBlock[],
  cols: typeof LEFT_COLS,
  startRow: number,
  payload: DailySchoolReportPayload
) {
  let currentRow = startRow;

  for (const block of blocks) {
    const lines = classAbsenceLines(block, payload);
    const layout = excelAbsenceLayout(lines);
    const end = currentRow + layout.rowSpan - 1;
    const center = {
      font: { size: 9 },
      alignment: { horizontal: "center" as const, vertical: "middle" as const, wrapText: true },
    };
    const absenceStyle = {
      font: { size: layout.excelFontSize },
      alignment: { horizontal: "left" as const, vertical: "top" as const, wrapText: true },
    };

    mergeValue(sheet, currentRow, cols.class, end, cols.class, block.className, {
      ...center,
      font: { bold: true, size: 10 },
    });
    mergeValue(sheet, currentRow, cols.cap, end, cols.cap, block.registered || "", center);
    mergeValue(sheet, currentRow, cols.present, end, cols.present, block.present, center);
    mergeValue(sheet, currentRow, cols.early, end, cols.early, block.earlyLeave || "", center);

    const ranges = absenceColRanges(cols.absences, cols.absencesEnd, layout.columnCount);
    layout.columns.forEach((columnLines, index) => {
      const [colStart, colEnd] = ranges[index] ?? ranges[ranges.length - 1];
      mergeValue(
        sheet,
        currentRow,
        colStart,
        end,
        colEnd,
        columnLines.join("\n"),
        absenceStyle
      );
    });

    mergeValue(sheet, currentRow, cols.enroll, end, cols.enroll, "", center);
    mergeValue(sheet, currentRow, cols.withdraw, end, cols.withdraw, "", center);

    for (let row = currentRow; row <= end; row += 1) {
      sheet.getRow(row).height = layout.rowHeight;
    }
    currentRow = end + 1;
  }
}

function writeStaffFooter(
  sheet: ExcelJS.Worksheet,
  payload: DailySchoolReportPayload,
  startRow: number
): number {
  let row = startRow;
  mergeValue(sheet, row, 1, row, LAST_COL, "教職員缺席情況", {
    font: { bold: true, size: 9 },
    alignment: { horizontal: "left", vertical: "middle" },
    fill: HEADER_FILL,
  });
  sheet.getRow(row).height = 16;
  row += 1;

  const pairs: Array<[string, string[]]> = [
    ["病假：", payload.staff.sick],
    ["事假：", payload.staff.personal],
    ["公假：", payload.staff.official],
    ["早退：", payload.staff.early],
  ];
  for (let index = 0; index < pairs.length; index += 2) {
    writeStaffPair(sheet, row, pairs[index], pairs[index + 1]);
    sheet.getRow(row).height = 16;
    row += 1;
  }

  return row;
}

function writeStaffPair(
  sheet: ExcelJS.Worksheet,
  row: number,
  left: [string, string[]],
  right: [string, string[]]
) {
  mergeValue(sheet, row, 1, row, 2, left[0], {
    font: { bold: true, size: 8 },
    alignment: { vertical: "middle" },
  });
  mergeValue(sheet, row, 3, row, 12, left[1].join("、"), {
    font: { size: 8 },
    alignment: { vertical: "middle", wrapText: true },
  });
  mergeValue(sheet, row, 13, row, 14, right[0], {
    font: { bold: true, size: 8 },
    alignment: { vertical: "middle" },
  });
  mergeValue(sheet, row, 15, row, LAST_COL, right[1].join("、"), {
    font: { size: 8 },
    alignment: { vertical: "middle", wrapText: true },
  });
}

function writeStatsFooter(
  sheet: ExcelJS.Worksheet,
  payload: DailySchoolReportPayload,
  startRow: number
): number {
  mergeValue(sheet, startRow, FORM_LABEL.start, startRow, FORM_LABEL.end, "級別", headerStyle());
  payload.formStats.forEach((stat, index) => {
    const cols = FORM_COLS[index];
    if (!cols) return;
    mergeValue(sheet, startRow, cols.start, startRow, cols.end, stat.label, headerStyle());
  });
  mergeValue(sheet, startRow, FORM_TOTAL.start, startRow, FORM_TOTAL.end, "總數", headerStyle());

  writeFormMetric(
    sheet,
    startRow + 1,
    "學生出席人數 :",
    payload.formStats.map((item) => item.present),
    payload.totalPresent,
    false
  );
  writeFormMetric(
    sheet,
    startRow + 2,
    "學生註冊人數 :",
    payload.formStats.map((item) => item.registered),
    payload.totalRegistered,
    false
  );
  writeFormMetric(
    sheet,
    startRow + 3,
    "學生出席百分比% :",
    payload.formStats.map((item) => item.attendanceRate),
    payload.totalAttendanceRate,
    true
  );

  const senior = payload.classes.slice(15, 30);
  return writeClassMetricTable(sheet, startRow + 5, "中四至中六", senior, {
    absent: payload.totalAbsent,
    attendanceRate: payload.totalAttendanceRate,
    late: payload.totalLate,
    punctualityRate: payload.schoolPunctualityRate,
    totalLabel: "TOTAL",
  });
}

function writeClassMetricTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  blocks: DailyClassBlock[],
  totals: {
    absent: number;
    attendanceRate: number;
    late: number;
    punctualityRate: number;
    totalLabel: string;
  }
): number {
  mergeValue(sheet, startRow, 1, startRow, CLASS_LABEL_END, title, headerStyle());
  blocks.forEach((block, index) => {
    const col = CLASS_CODE_START + index;
    mergeValue(sheet, startRow, col, startRow, col, block.className, headerStyle(8));
  });
  mergeValue(
    sheet,
    startRow,
    CLASS_TOTAL_START,
    startRow,
    CLASS_TOTAL_END,
    totals.totalLabel,
    headerStyle()
  );

  writeClassMetricRow(
    sheet,
    startRow + 1,
    "缺席人數",
    blocks.map((item) => item.absentCount || ""),
    totals.absent,
    false
  );
  writeClassMetricRow(
    sheet,
    startRow + 2,
    "出席百分比 :",
    blocks.map((item) => item.attendanceRate),
    totals.attendanceRate,
    true
  );
  writeClassMetricRow(
    sheet,
    startRow + 3,
    "學生遲到人數：",
    blocks.map((item) => item.lateCount || 0),
    totals.late,
    false
  );
  writeClassMetricRow(
    sheet,
    startRow + 4,
    "守時百分比 :",
    blocks.map((item) => item.punctualityRate),
    totals.punctualityRate,
    true
  );
  return startRow + 4;
}

function writeClassMetricRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  values: Array<number | string>,
  total: number,
  percent: boolean
) {
  mergeValue(sheet, row, 1, row, CLASS_LABEL_END, label, labelStyle());
  values.forEach((value, index) => {
    const col = CLASS_CODE_START + index;
    mergeValue(sheet, row, col, row, col, value, {
      ...centerStyle(),
      numFmt: percent ? "0.00%" : undefined,
    });
  });
  mergeValue(sheet, row, CLASS_TOTAL_START, row, CLASS_TOTAL_END, total, {
    ...centerStyle(),
    font: { bold: true, size: 8 },
    numFmt: percent ? "0.00%" : undefined,
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
  mergeValue(sheet, row, FORM_LABEL.start, row, FORM_LABEL.end, label, labelStyle());
  values.forEach((value, index) => {
    const cols = FORM_COLS[index];
    if (!cols) return;
    mergeValue(sheet, row, cols.start, row, cols.end, value, {
      ...centerStyle(),
      numFmt: percent ? "0.00%" : undefined,
    });
  });
  mergeValue(sheet, row, FORM_TOTAL.start, row, FORM_TOTAL.end, total, {
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
