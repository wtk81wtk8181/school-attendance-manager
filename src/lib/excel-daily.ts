import ExcelJS from "exceljs";
import { SCHOOL_NAME } from "@/lib/seed";
import {
  formatDailyAbsenceLine,
  type DailyClassBlock,
  type DailyAbsenceRow,
  type DailySchoolReportPayload,
} from "@/lib/daily-report";

const MING = "新細明體";
const TIMES = "Times New Roman";
const THIN: ExcelJS.BorderStyle = "thin";
const MEDIUM: ExcelJS.BorderStyle = "medium";
const BLACK = { argb: "FF000000" };
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE7EEF7" },
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
const MEDIUM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: MEDIUM, color: BLACK },
  left: { style: MEDIUM, color: BLACK },
  right: { style: MEDIUM, color: BLACK },
  bottom: { style: MEDIUM, color: BLACK },
};

/** 每日約 40 人缺席，列印頁最少預留行數（含空白行供手寫） */
const PRINT_LIST_MIN_ROWS = 40;

const LEFT_COLS = { class: 1, cap: 2, present: 3, early: 4, absent: 5, note: 6 };
const RIGHT_COLS = { class: 8, cap: 9, present: 10, early: 11, absent: 12, note: 13 };

export async function buildDailySchoolWorkbook(
  payload: DailySchoolReportPayload
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  writePrintListSheet(workbook, payload);
  writeOverviewSheet(workbook, payload);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** 第 1 頁：缺席明細列印用（預留約 40 行，字大線清） */
function writePrintListSheet(
  workbook: ExcelJS.Workbook,
  payload: DailySchoolReportPayload
) {
  const sheet = workbook.addWorksheet("缺席名單（列印）", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      pageOrder: "downThenOver",
      draft: false,
      showGridLines: false,
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

  const widths = [5, 8, 10, 14, 10, 36, 14, 12];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  mergeCells(sheet, 1, 1, 1, 8, `${SCHOOL_NAME}　每日缺席名單（列印用）`, {
    font: { bold: true, size: 16, name: MING, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: TITLE_FILL,
    border: MEDIUM_BORDER,
  });
  sheet.getRow(1).height = 26;

  mergeCells(
    sheet,
    2,
    1,
    2,
    8,
    `${payload.dateLabel}　共 ${payload.rows.length} 人　預留 ${PRINT_LIST_MIN_ROWS} 行`,
    {
      font: { bold: true, size: 12, name: MING },
      alignment: { horizontal: "center", vertical: "middle" },
      border: THIN_BORDER,
    }
  );
  sheet.getRow(2).height = 20;

  const headers = ["序", "班別", "學號", "姓名", "狀況", "原因／備註", "致電人士", "致電時間"];
  headers.forEach((text, index) => {
    styleCell(sheet.getCell(3, index + 1), text, {
      font: { bold: true, size: 11, name: MING },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      fill: HEADER_FILL,
      border: MEDIUM_BORDER,
    });
  });
  sheet.getRow(3).height = 22;
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 8 },
  };
  sheet.views = [{ state: "frozen", ySplit: 3, showGridLines: false }];

  const sorted = [...payload.rows].sort(
    (a, b) =>
      a.className.localeCompare(b.className) ||
      a.studentNo.localeCompare(b.studentNo)
  );
  const totalRows = Math.max(PRINT_LIST_MIN_ROWS, sorted.length);

  for (let i = 0; i < totalRows; i += 1) {
    const rowIndex = 4 + i;
    const row = sorted[i];
    const values = row
      ? [
          i + 1,
          row.classLabel || row.className,
          row.studentNo,
          row.name,
          row.status,
          detailReason(row),
          row.calledBy && row.calledBy !== "尚未致電" ? row.calledBy : "",
          row.calledAt && row.calledAt !== "—" ? row.calledAt : "",
        ]
      : [i + 1, "", "", "", "", "", "", ""];

    values.forEach((value, col) => {
      styleCell(sheet.getCell(rowIndex, col + 1), value, {
        font: { size: 11, name: col === 0 || col === 2 ? TIMES : MING },
        alignment: {
          horizontal: col === 5 ? "left" : "center",
          vertical: "middle",
          wrapText: true,
        },
        border: THIN_BORDER,
      });
    });
    sheet.getRow(rowIndex).height = 22;
  }

  const endRow = 3 + totalRows;
  sheet.pageSetup.printArea = `A1:H${endRow}`;
  sheet.pageSetup.printTitlesRow = "1:3";

  const noteRow = endRow + 2;
  mergeCells(
    sheet,
    noteRow,
    1,
    noteRow,
    8,
    "註：空白行可供當日補記。列印時請選「適合頁寬」或本工作表預設版面。班別統計見「班別總覽」。",
    {
      font: { size: 9, name: MING, italic: true },
      alignment: { horizontal: "left", vertical: "middle", wrapText: true },
    }
  );
  sheet.getRow(noteRow).height = 18;
}

function detailReason(row: DailyAbsenceRow): string {
  if (row.statusKey === "half_absent" || row.statusKey === "early") {
    return formatDailyAbsenceLine(row).replace(`${row.name}：`, "");
  }
  const reason = row.reason.trim() || row.status;
  const half = row.days === 0.5 ? "（半日）" : "";
  return `${reason}${half}`;
}

/** 第 2 頁：班別總覽（人數清楚，缺席只顯示人數，避免擠字） */
function writeOverviewSheet(
  workbook: ExcelJS.Workbook,
  payload: DailySchoolReportPayload
) {
  const sheet = workbook.addWorksheet("班別總覽", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: true,
      draft: false,
      showGridLines: false,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  const widths = [8, 8, 7, 7, 8, 28, 3, 8, 8, 7, 7, 8, 28];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  mergeCells(sheet, 1, 1, 1, 13, `${SCHOOL_NAME}　學生缺席每日報告表（班別總覽）`, {
    font: { bold: true, size: 16, name: MING, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: TITLE_FILL,
    border: MEDIUM_BORDER,
  });
  sheet.getRow(1).height = 24;

  mergeCells(sheet, 2, 1, 2, 13, payload.dateLabel, {
    font: { bold: true, size: 13, name: MING },
    alignment: { horizontal: "center", vertical: "middle" },
    border: THIN_BORDER,
  });
  sheet.getRow(2).height = 20;

  mergeCells(sheet, 3, 1, 3, 6, "中一至中三", {
    font: { bold: true, size: 12, name: MING },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
    border: MEDIUM_BORDER,
  });
  mergeCells(sheet, 3, 8, 3, 13, "中四至中六", {
    font: { bold: true, size: 12, name: MING },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
    border: MEDIUM_BORDER,
  });
  sheet.getRow(3).height = 18;

  writeOverviewHeaders(sheet, 4, LEFT_COLS);
  writeOverviewHeaders(sheet, 4, RIGHT_COLS);
  sheet.getRow(4).height = 24;

  writeOverviewBlocks(sheet, payload.classes.slice(0, 15), LEFT_COLS, 5);
  writeOverviewBlocks(sheet, payload.classes.slice(15, 30), RIGHT_COLS, 5);

  const summaryStart = 21;
  writeOverviewSummary(sheet, payload, summaryStart);
  sheet.pageSetup.printArea = `A1:M${summaryStart + 8}`;
}

function writeOverviewHeaders(
  sheet: ExcelJS.Worksheet,
  row: number,
  cols: typeof LEFT_COLS
) {
  const headers: Array<[number, string]> = [
    [cols.class, "班別"],
    [cols.cap, "總人數"],
    [cols.present, "出席"],
    [cols.early, "早退"],
    [cols.absent, "缺席人數"],
    [cols.note, "缺席摘要（詳見列印名單）"],
  ];
  for (const [col, text] of headers) {
    styleCell(sheet.getCell(row, col), text, {
      font: { bold: true, size: 11, name: MING },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      fill: HEADER_FILL,
      border: MEDIUM_BORDER,
    });
  }
}

function writeOverviewBlocks(
  sheet: ExcelJS.Worksheet,
  blocks: DailyClassBlock[],
  cols: typeof LEFT_COLS,
  startRow: number
) {
  blocks.forEach((block, index) => {
    const row = startRow + index;
    const summary =
      block.absenceLines.length === 0
        ? ""
        : block.absenceLines.length <= 2
          ? block.absenceLines.join("；")
          : `${block.absenceLines.slice(0, 2).join("；")}…共${block.absenceLines.length}人`;

    const cells: Array<[number, ExcelJS.CellValue, Partial<ExcelJS.Font>?]> = [
      [cols.class, block.className, { bold: true, size: 12, name: TIMES }],
      [cols.cap, block.registered || "", { size: 11, name: MING }],
      [cols.present, block.present, { size: 11, name: MING }],
      [cols.early, block.earlyLeave || "", { size: 11, name: MING }],
      [cols.absent, block.absentCount || "", { bold: true, size: 11, name: MING }],
      [cols.note, summary, { size: 10, name: MING }],
    ];

    for (const [col, value, font] of cells) {
      styleCell(sheet.getCell(row, col), value, {
        font: font ?? { size: 11, name: MING },
        alignment: {
          horizontal: col === cols.note ? "left" : "center",
          vertical: "middle",
          wrapText: true,
        },
        border: THIN_BORDER,
      });
    }
    sheet.getRow(row).height = 20;
  });
}

function writeOverviewSummary(
  sheet: ExcelJS.Worksheet,
  payload: DailySchoolReportPayload,
  startRow: number
) {
  mergeCells(sheet, startRow, 1, startRow, 6, "教職員缺席情況", {
    font: { bold: true, size: 12, name: MING },
    alignment: { horizontal: "left", vertical: "middle" },
    fill: HEADER_FILL,
    border: MEDIUM_BORDER,
  });

  const staffLines = [
    ["病假", payload.staff.sick],
    ["事假", payload.staff.personal],
    ["公假", payload.staff.official],
    ["早退", payload.staff.early],
  ] as const;

  staffLines.forEach(([label, names], index) => {
    const row = startRow + 1 + index;
    styleCell(sheet.getCell(row, 1), `${label}：`, {
      font: { bold: true, size: 11, name: MING },
      alignment: { vertical: "middle" },
      border: THIN_BORDER,
    });
    mergeCells(sheet, row, 2, row, 6, names.join("、") || "—", {
      font: { size: 11, name: MING },
      alignment: { vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
    sheet.getRow(row).height = 18;
  });

  const right = startRow;
  mergeCells(sheet, right, 8, right, 13, "全校統計", {
    font: { bold: true, size: 12, name: MING },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: HEADER_FILL,
    border: MEDIUM_BORDER,
  });

  const stats: Array<[string, string]> = [
    ["註冊人數", String(payload.totalRegistered)],
    ["出席人數", String(payload.totalPresent)],
    ["缺席／請假", String(payload.totalAbsent)],
    ["出席率", `${(payload.totalAttendanceRate * 100).toFixed(2)}%`],
  ];
  stats.forEach(([label, value], index) => {
    const row = right + 1 + index;
    styleCell(sheet.getCell(row, 8), label, {
      font: { bold: true, size: 11, name: MING },
      alignment: { horizontal: "right", vertical: "middle" },
      border: THIN_BORDER,
    });
    mergeCells(sheet, row, 9, row, 13, value, {
      font: { size: 12, name: TIMES },
      alignment: { horizontal: "center", vertical: "middle" },
      border: THIN_BORDER,
    });
    sheet.getRow(row).height = 18;
  });
}

interface CellStyle {
  font?: Partial<ExcelJS.Font>;
  alignment?: Partial<ExcelJS.Alignment>;
  fill?: ExcelJS.Fill;
  border?: Partial<ExcelJS.Borders>;
}

function mergeCells(
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
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = sheet.getCell(row, col);
      if (row === startRow && col === startCol) {
        styleCell(cell, value, style);
      } else {
        applyStyleOnly(cell, style);
      }
    }
  }
}

function styleCell(
  cell: ExcelJS.Cell,
  value: ExcelJS.CellValue,
  style: CellStyle = {}
) {
  cell.value = value;
  applyStyleOnly(cell, style);
}

function applyStyleOnly(cell: ExcelJS.Cell, style: CellStyle = {}) {
  cell.border = style.border ?? THIN_BORDER;
  if (style.font) cell.font = style.font;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.fill) cell.fill = style.fill;
}
