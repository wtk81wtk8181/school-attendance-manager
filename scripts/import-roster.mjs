import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CLASS_TEACHERS = {
  "1A": "李志強", "1B": "陳惠玲", "1C": "張志偉", "1D": "吳美琪", "1E": "黃家明",
  "2A": "劉雅婷", "2B": "鄭偉豪", "2C": "何詩韻", "2D": "林俊傑", "2E": "馬翠珊",
  "3A": "蔡子軒", "3B": "周啟明", "3C": "葉曉彤", "3D": "羅嘉欣", "3E": "馮志成",
  "4A": "謝詠儀", "4B": "潘浩然", "4C": "鄧麗萍", "4D": "韓子健", "4E": "袁淑芬",
  "5A": "林佩儀", "5B": "高俊宇", "5C": "鍾雅文", "5D": "黎家樂", "5E": "溫曉琳",
  "6A": "黃詠詩", "6B": "蘇子朗", "6C": "莫凱婷", "6D": "錢偉文", "6E": "方曉晴",
};

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.richText) {
    return value.richText.map((item) => item.text).join("");
  }
  return String(value).trim();
}

function streamIndex(className) {
  const stream = className.slice(-1).toUpperCase();
  return "ABCDE".indexOf(stream) + 1;
}

function parseSheet(worksheet, form) {
  const students = [];
  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const classCode = cellText(row.getCell(1).value);
    const nameEn = cellText(row.getCell(2).value);
    const name = cellText(row.getCell(3).value);
    const classNo = Number(cellText(row.getCell(5).value) || cellText(row.getCell(4).value) || 0);

    if (classCode.startsWith("CLASS")) continue;
    if (classCode === "CLASS CODE" || nameEn === "NAME") continue;
    if (!/^\d[A-E]$/i.test(classCode) || !nameEn || !name) continue;

    const className = classCode.toUpperCase();
    const year = String(26 - form).padStart(2, "0");
    const studentNo = `${year}${String(streamIndex(className)).padStart(2, "0")}${String(classNo || students.filter((item) => item.className === className).length + 1).padStart(3, "0")}`;
    const teacher = CLASS_TEACHERS[className] ?? "班主任";
    students.push({
      id: `s-${className.toLowerCase()}-${String(classNo || 0).padStart(2, "0")}`,
      studentNo,
      name,
      nameEn,
      form,
      className,
      homeroomTeacherId: `u-${className.toLowerCase()}`,
      homeroomTeacherName: teacher,
    });
  }
  return students;
}

const sources = [
  { file: "S.1_中一級 (04.08.2026).xlsx", form: 1, sheets: ["S1 "] },
  { file: "S.2_中二級 (04.08.2026).xlsx", form: 2, sheets: ["S2"] },
  { file: "S.3_中三級 (04.08.2026).xlsx", form: 3, sheets: ["S3"] },
  { file: "S.4_中四級 (04.08.2026).xlsx", form: 4, sheets: ["工作表1"] },
  { file: "S.5_中五級 (04.08.2026).xlsx", form: 5, sheets: ["5A-5D ", "5E"] },
  { file: "S.6_中六級 (04.08.2026).xlsx", form: 6, sheets: ["S.6 A-D", "S.6 E"] },
];

const allStudents = [];
for (const source of sources) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(root, source.file));
  for (const sheetName of source.sheets) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`找不到工作表 ${sheetName}（${source.file}）`);
    }
    allStudents.push(...parseSheet(worksheet, source.form));
  }
}

allStudents.sort(
  (left, right) =>
    left.className.localeCompare(right.className) ||
    left.studentNo.localeCompare(right.studentNo)
);

const output = `/* eslint-disable */
// 自動產生：npm run import:roster
import type { Student } from "@/lib/types";

export const ROSTER_STUDENTS: Student[] = ${JSON.stringify(allStudents, null, 2)};
`;

const outPath = path.join(root, "src/data/roster-students.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf8");
console.log(`已匯入 ${allStudents.length} 名學生 → ${outPath}`);
