import ExcelJS from "exceljs";
import { SCHOOL_NAME } from "@/lib/seed";
import type { LoDayStaff, LoDayStudentStats, LoReportPayload } from "@/lib/lo-report";

const MING = "新細明體";
const TIMES = "Times New Roman";
const BLACK = { argb: "FF000000" };
const RED = { argb: "FFFF0000" };
const BLUE = { argb: "FF0070C0" };
const YELLOW: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};
const THIN: Partial<ExcelJS.Border> = { style: "thin", color: BLACK };
const MEDIUM: Partial<ExcelJS.Border> = { style: "medium", color: BLACK };
const COLS = 29;
const DAY_METRIC_ROWS = 4;
const STUDENT_START = 6;
const STAFF_HEADER_ROW = 27;
const STAFF_START = 28;
const TEACHER_ROWS = 6;
const STAFF_ROWS_PER_DAY = 8;

interface SchoolBlock {
  name: string;
  labelCol: number;
  formStart: number;
  spacerCol: number;
  totalCol: number;
  startCol: number;
  endCol: number;
}

const SCHOOLS: SchoolBlock[] = [
  { name: "萬鈞伯裘", labelCol: 3, formStart: 4, spacerCol: 10, totalCol: 11, startCol: 3, endCol: 11 },
  { name: "萬鈞匯知", labelCol: 12, formStart: 13, spacerCol: 19, totalCol: 20, startCol: 12, endCol: 20 },
  { name: "萬鈞毅智", labelCol: 21, formStart: 22, spacerCol: 28, totalCol: 29, startCol: 21, endCol: 29 },
];

const PAK_KAU = SCHOOLS[0];

const COLUMN_WIDTHS = [
  6.13, 5.25, 5.13, 7, 7, 7, 7, 7, 7, 5.13, 9.88, 4.75, 5.13, 5.13, 5.13, 5.13, 5.75, 5.13,
  5.13, 5.63, 4.5, 5.13, 5.13, 5.13, 5.13, 5.75, 5.13, 6, 7.13,
];

export async function buildLoWorkbook(payload: LoReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(payload.sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      printArea: `A1:AC${STAFF_START + STAFF_ROWS_PER_DAY * 5 - 1}`,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.25,
        footer: 0.25,
      },
    },
  });

  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  writeTitle(sheet, payload);
  writeStudentHeaders(sheet, payload);
  payload.days.forEach((day, index) => writeStudentDay(sheet, day, index));
  writeStaffSection(sheet, payload);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function writeTitle(sheet: ExcelJS.Worksheet, payload: LoReportPayload) {
  sheet.mergeCells(1, 1, 1, COLS);
  const title = sheet.getCell(1, 1);
  title.value = `Daily Attendance Record (${payload.academicYearLabel})`;
  title.font = { bold: true, size: 14, name: TIMES };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 22.5;
  for (let col = 1; col <= COLS; col += 1) {
    sheet.getCell(1, col).border = { bottom: MEDIUM };
    sheet.getCell(1, col).font = { bold: true, size: 14, name: TIMES };
    sheet.getCell(1, col).alignment = { horizontal: "center", vertical: "middle" };
  }

  sheet.getRow(2).height = 16.5;
  writeCell(sheet, 2, 1, "日期", {
    font: { size: 12, name: MING },
    alignment: { horizontal: "center" },
    border: { left: MEDIUM, top: MEDIUM, bottom: THIN },
  });
  writeCell(sheet, 2, 2, "", {
    border: { top: MEDIUM, bottom: THIN },
  });
  for (const school of SCHOOLS) {
    sheet.mergeCells(2, school.startCol, 2, school.endCol);
    writeRangeBorder(sheet, 2, school.startCol, 2, school.endCol, {
      left: MEDIUM,
      top: MEDIUM,
      bottom: THIN,
      right: MEDIUM,
    });
    const cell = sheet.getCell(2, school.startCol);
    cell.value = school.name;
    cell.font = { size: 12, name: MING };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
}

function writeStudentHeaders(sheet: ExcelJS.Worksheet, payload: LoReportPayload) {
  sheet.getRow(3).height = 14.1;
  sheet.getRow(4).height = 14.1;
  sheet.getRow(5).height = 14.1;

  for (const school of SCHOOLS) {
    writeCell(sheet, 4, school.labelCol, "班級", {
      font: { size: 8, name: MING },
      alignment: { horizontal: "center", shrinkToFit: true },
      border: { left: MEDIUM, right: THIN },
    });
    for (let form = 0; form < 6; form += 1) {
      writeCell(sheet, 4, school.formStart + form, `S${form + 1}`, {
        font: { size: 8, name: TIMES },
        alignment: { horizontal: "center" },
        border: { left: THIN },
      });
    }
    writeCell(sheet, 4, school.totalCol, "Total", {
      font: { size: 8, name: TIMES },
      alignment: { horizontal: "center" },
      border: { right: MEDIUM },
    });

    writeCell(sheet, 5, school.labelCol, "班數", {
      font: { size: 8, name: MING },
      alignment: { horizontal: "center", shrinkToFit: true },
      border: { left: MEDIUM, right: THIN, bottom: THIN },
    });
    for (let form = 0; form < 6; form += 1) {
      const isPakKau = school === PAK_KAU;
      writeCell(sheet, 5, school.formStart + form, isPakKau ? payload.classCounts[form] : "", {
        font: { bold: true, size: 8, name: TIMES, color: BLUE },
        alignment: { horizontal: "center" },
        border: { bottom: THIN, left: THIN },
      });
    }
    writeCell(
      sheet,
      5,
      school.totalCol,
      school === PAK_KAU
        ? { formula: `SUM(${colLetter(school.formStart)}5:${colLetter(school.formStart + 5)}5)` }
        : "",
      {
        font: { bold: true, size: 8, name: TIMES, color: BLUE },
        alignment: { horizontal: "center" },
        border: { right: MEDIUM, bottom: THIN },
      }
    );
  }
}

function writeStudentDay(sheet: ExcelJS.Worksheet, day: LoDayStudentStats, dayIndex: number) {
  const start = STUDENT_START + dayIndex * DAY_METRIC_ROWS;
  const labels = ["出席", "註冊", "%", "缺席"] as const;
  for (let offset = 0; offset < DAY_METRIC_ROWS; offset += 1) {
    sheet.getRow(start + offset).height = 14.1;
  }

  writeCell(sheet, start, 1, excelDate(day.date), {
    font: { size: 12, name: TIMES },
    alignment: { horizontal: "center" },
    border: { left: MEDIUM, top: THIN },
    numFmt: "dd/mm",
  });
  writeCell(sheet, start, 2, day.weekdayLabel, {
    font: { size: 8, name: MING },
    alignment: { horizontal: "center" },
    border: { top: THIN },
  });
  for (let offset = 1; offset < DAY_METRIC_ROWS; offset += 1) {
    writeCell(sheet, start + offset, 1, "", { border: { left: MEDIUM } });
    writeCell(sheet, start + offset, 2, "", {});
  }

  for (const school of SCHOOLS) {
    labels.forEach((label, offset) => {
      const row = start + offset;
      const isAbsent = label === "缺席";
      const isLast = offset === DAY_METRIC_ROWS - 1;
      writeCell(sheet, row, school.labelCol, label, {
        font: { size: 8, name: label === "%" ? TIMES : MING },
        alignment: { horizontal: "center", shrinkToFit: true },
        border: {
          left: MEDIUM,
          right: THIN,
          top: offset === 0 ? THIN : undefined,
          bottom: isLast ? MEDIUM : undefined,
        },
        fill: isAbsent ? YELLOW : undefined,
      });
    });

    for (let form = 0; form < 6; form += 1) {
      const col = school.formStart + form;
      const stat = school === PAK_KAU ? day.forms[form] : undefined;
      const hasData = Boolean(stat && stat.registered > 0);
      writeMetricCell(sheet, start, col, hasData ? stat!.present : "", false, THIN);
      writeMetricCell(sheet, start + 1, col, hasData ? stat!.registered : "", false, THIN);
      writeMetricCell(sheet, start + 2, col, hasData ? stat!.attendanceRate : "", true, THIN);
      writeCell(
        sheet,
        start + 3,
        col,
        hasData
          ? { formula: `${colLetter(col)}${start + 1}-${colLetter(col)}${start}` }
          : "",
        {
          font: { size: 8, name: TIMES, color: RED },
          alignment: { horizontal: "center", vertical: "middle", wrapText: true },
          border: { bottom: MEDIUM, left: THIN },
          fill: YELLOW,
        }
      );
    }

    const firstForm = colLetter(school.formStart);
    const lastForm = colLetter(school.formStart + 5);
    writeMetricCell(
      sheet,
      start,
      school.totalCol,
      school === PAK_KAU ? { formula: `SUM(${firstForm}${start}:${lastForm}${start})` } : "",
      false,
      MEDIUM,
      "right"
    );
    writeMetricCell(
      sheet,
      start + 1,
      school.totalCol,
      school === PAK_KAU ? { formula: `SUM(${firstForm}${start + 1}:${lastForm}${start + 1})` } : "",
      false,
      MEDIUM,
      "right"
    );
    writeMetricCell(
      sheet,
      start + 2,
      school.totalCol,
      school === PAK_KAU && day.totalRegistered > 0 ? day.totalAttendanceRate : "",
      true,
      MEDIUM,
      "right"
    );
    writeCell(
      sheet,
      start + 3,
      school.totalCol,
      school === PAK_KAU
        ? { formula: `SUM(${firstForm}${start + 3}:${lastForm}${start + 3})` }
        : "",
      {
        font: { size: 8, name: TIMES, color: RED },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: { right: MEDIUM, bottom: MEDIUM },
        fill: YELLOW,
      }
    );
  }
}

function writeStaffSection(sheet: ExcelJS.Worksheet, payload: LoReportPayload) {
  sheet.getRow(26).height = 17.25;
  for (let col = 1; col <= COLS; col += 1) {
    sheet.getCell(26, col).border = { bottom: MEDIUM };
  }

  sheet.getRow(STAFF_HEADER_ROW).height = 16.5;
  writeCell(sheet, STAFF_HEADER_ROW, 1, "", { border: { left: MEDIUM, top: MEDIUM, bottom: MEDIUM } });
  writeCell(sheet, STAFF_HEADER_ROW, 2, "", { border: { top: MEDIUM, bottom: MEDIUM } });
  for (const school of SCHOOLS) {
    sheet.mergeCells(STAFF_HEADER_ROW, school.startCol, STAFF_HEADER_ROW, school.endCol);
    writeRangeBorder(sheet, STAFF_HEADER_ROW, school.startCol, STAFF_HEADER_ROW, school.endCol, {
      left: MEDIUM,
      top: MEDIUM,
      bottom: MEDIUM,
      right: MEDIUM,
    });
    const cell = sheet.getCell(STAFF_HEADER_ROW, school.startCol);
    cell.value = school.name;
    cell.font = { size: 12, name: MING };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  payload.staffDays.forEach((day, index) => writeStaffDay(sheet, day, index));
}

function writeStaffDay(sheet: ExcelJS.Worksheet, day: LoDayStaff, dayIndex: number) {
  const start = STAFF_START + dayIndex * STAFF_ROWS_PER_DAY;
  const teacherLines = chunkJoin(day.teachers, 3, TEACHER_ROWS);
  const officeLines = chunkJoin(day.office, 3, 1);
  const janitorLines = chunkJoin(day.janitors, 3, 1);

  for (let offset = 0; offset < STAFF_ROWS_PER_DAY; offset += 1) {
    sheet.getRow(start + offset).height = 26.45;
    const isLast = offset === STAFF_ROWS_PER_DAY - 1;
    writeCell(sheet, start + offset, 1, offset === 0 ? excelDate(day.date) : "", {
      font: { size: 12, name: TIMES },
      alignment: { horizontal: "center" },
      border: {
        left: MEDIUM,
        top: offset === 0 ? THIN : undefined,
        bottom: isLast ? MEDIUM : undefined,
      },
      numFmt: offset === 0 ? "dd/mm" : undefined,
    });
    writeCell(sheet, start + offset, 2, offset === 0 ? day.weekdayLabel : "", {
      font: { size: 8, name: MING },
      alignment: { horizontal: "center" },
      border: { top: offset === 0 ? THIN : undefined, bottom: isLast ? MEDIUM : undefined },
    });
  }

  for (const school of SCHOOLS) {
    const isPakKau = school === PAK_KAU;
    writeStaffLabelRow(sheet, start, school, "老師", false);
    for (let extra = 1; extra < TEACHER_ROWS; extra += 1) {
      writeStaffLabelRow(sheet, start + extra, school, "", false);
    }
    writeStaffLabelRow(sheet, start + TEACHER_ROWS, school, "職員", false);
    writeStaffLabelRow(sheet, start + TEACHER_ROWS + 1, school, "校工", true);

    writeStaffNames(sheet, start, school, isPakKau ? teacherLines[0] ?? "" : "", false, true);
    for (let extra = 1; extra < TEACHER_ROWS; extra += 1) {
      writeStaffNames(sheet, start + extra, school, isPakKau ? teacherLines[extra] ?? "" : "", false, false);
    }
    writeStaffNames(sheet, start + TEACHER_ROWS, school, isPakKau ? officeLines[0] ?? "" : "", false, false);
    writeStaffNames(sheet, start + TEACHER_ROWS + 1, school, isPakKau ? janitorLines[0] ?? "" : "", true, false);
  }
}

function writeStaffLabelRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  school: SchoolBlock,
  label: string,
  last: boolean
) {
  writeCell(sheet, row, school.labelCol, label, {
    font: { size: 7, name: MING },
    alignment: { horizontal: "center" },
    border: {
      left: MEDIUM,
      right: THIN,
      bottom: last ? MEDIUM : undefined,
    },
  });
}

function writeStaffNames(
  sheet: ExcelJS.Worksheet,
  row: number,
  school: SchoolBlock,
  text: string,
  last: boolean,
  first: boolean
) {
  const startCol = school.formStart;
  const endCol = school.endCol;
  sheet.mergeCells(row, startCol, row, endCol);
  writeRangeBorder(sheet, row, startCol, row, endCol, {
    left: THIN,
    top: first ? MEDIUM : undefined,
    bottom: last ? MEDIUM : undefined,
    right: MEDIUM,
  });
  const cell = sheet.getCell(row, startCol);
  cell.value = text;
  cell.font = { size: 9, name: MING };
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
}

function writeMetricCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  percent: boolean,
  side: Partial<ExcelJS.Border>,
  sideKey: "left" | "right" = "left"
) {
  writeCell(sheet, row, col, value, {
    font: { size: 8, name: TIMES, color: RED },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: { [sideKey]: side, top: row % DAY_METRIC_ROWS === 2 ? THIN : undefined },
    numFmt: percent ? "0.0%" : undefined,
  });
}

function writeCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  style: {
    font?: Partial<ExcelJS.Font>;
    alignment?: Partial<ExcelJS.Alignment>;
    border?: Partial<ExcelJS.Borders>;
    fill?: ExcelJS.Fill;
    numFmt?: string;
  }
) {
  const cell = sheet.getCell(row, col);
  cell.value = value;
  if (style.font) cell.font = style.font;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.fill) cell.fill = style.fill;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

function writeRangeBorder(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  border: Partial<ExcelJS.Borders>
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.border = { ...cell.border, ...border };
    }
  }
}

function chunkJoin(items: string[], size: number, maxLines: number): string[] {
  if (items.length === 0) return [];
  const lines: string[] = [];
  for (let index = 0; index < items.length; index += size) {
    lines.push(items.slice(index, index + size).join("、"));
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines - 1);
  kept.push(lines.slice(maxLines - 1).join("、"));
  return kept;
}

function excelDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function colLetter(col: number): string {
  let value = col;
  let letter = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}
