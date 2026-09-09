import ExcelJS from "exceljs";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import type { WongReportPayload } from "@/lib/wong-report";

const NAVY = "1B365D";
const GOLD = "C4A35A";
const HEADER_FILL = "D9E2F3";
const YELLOW: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};

const COLUMNS = [
  "中文姓名\nChinese name",
  "英文姓名\nEnglish name",
  "計入缺席日數\nCounted absence days",
  "未有醫生紙日期\nDates without doctor's note",
  "未有醫生紙日數\nDays without doctor's note",
  "遲到次數\nLate arrivals",
] as const;

const LAST_COL_LETTER = "F";

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
};

export async function buildWongWorkbook(payload: WongReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("每月報告", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  sheet.columns = [
    { width: 16 },
    { width: 24 },
    { width: 18 },
    { width: 32 },
    { width: 20 },
    { width: 16 },
  ];

  sheet.mergeCells(`A1:${LAST_COL_LETTER}1`);
  sheet.getCell("A1").value = `${SCHOOL_NAME}　${SCHOOL_NAME_EN}（${payload.academicYear}）`;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: `FF${NAVY}` } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells(`A2:${LAST_COL_LETTER}2`);
  sheet.getCell("A2").value = `每月報告 / Monthly Report　${payload.monthLabel}`;
  sheet.getCell("A2").font = { bold: true, size: 14, color: { argb: `FF${NAVY}` } };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells(`A3:${LAST_COL_LETTER}3`);
  sheet.getCell("A3").value =
    "計入缺席日數＝無故缺席及未獲批請假；未有醫生紙以黃色標示；遲到另行統計次數。\nCounted absence days = unexcused absence and unapproved leave. Yellow = missing doctor's note. Late arrivals are counted separately.";
  sheet.getCell("A3").font = { size: 10, italic: true, color: { argb: "FF5C6570" } };
  sheet.getCell("A3").alignment = { wrapText: true, vertical: "middle" };

  let rowIndex = 5;
  for (const section of payload.classes) {
    sheet.mergeCells(`A${rowIndex}:${LAST_COL_LETTER}${rowIndex}`);
    const classTitle = sheet.getCell(`A${rowIndex}`);
    classTitle.value = `${section.classLabel} / Class ${section.classLabel}`;
    classTitle.font = { bold: true, size: 12, color: { argb: `FF${NAVY}` } };
    classTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${HEADER_FILL}` },
    };
    classTitle.border = THIN_BORDER;
    rowIndex += 1;

    const headerRow = sheet.getRow(rowIndex);
    COLUMNS.forEach((label, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = label;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${NAVY}` },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        ...THIN_BORDER,
        bottom: { style: "thin", color: { argb: `FF${GOLD}` } },
      };
    });
    headerRow.height = 32;
    rowIndex += 1;

    for (const student of section.rows) {
      const dataRow = sheet.getRow(rowIndex);
      const values = [
        student.name,
        student.nameEn || "—",
        student.countedAbsenceDays,
        student.missingDoctorDates.join("、") || "—",
        student.missingDoctorDays || "—",
        student.lateCount || "—",
      ];
      values.forEach((value, index) => {
        const cell = dataRow.getCell(index + 1);
        cell.value = value;
        cell.alignment = {
          horizontal: index >= 2 ? "center" : "left",
          vertical: "middle",
          wrapText: index === 3,
        };
        cell.border = THIN_BORDER;
        if (student.highlight) {
          cell.fill = YELLOW;
        }
      });
      rowIndex += 1;
    }

    rowIndex += 1;
  }

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 36;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
