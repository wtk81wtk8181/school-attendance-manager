import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CLASS_TEACHERS = {
  "1A": "黃轉鳳、郭家銘", "1B": "何慧欣、范嘉揚", "1C": "Ramandeep、丘健", "1D": "Dari、鄧鵠耀", "1E": "Scott、張思華",
  "2A": "林紀彤", "2B": "陳紀筠", "2C": "黃詠淇", "2D": "Wayne、黃麗娜", "2E": "Roisin、陳振華",
  "3A": "陳珮儀", "3B": "黃俊偉", "3C": "陳梃浠", "3D": "徐治文", "3E": "Johan、范㬢文",
  "4A": "馮耀强", "4B": "周柏言", "4C": "林子華", "4D": "韓卓穎", "4E": "吳諾文、Heumil Wang",
  "5A": "曹思思", "5B": "黃子毅", "5C": "劉倩慈", "5D": "歐陽佩霞", "5E": "劉麗芳、黃守宏",
  "6A": "黃天異", "6B": "陳秋雲", "6C": "廖淑君、羅祉臻", "6D": "李日東", "6E": "鄭敬宏、Mirza",
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
    const serial =
      classNo || students.filter((item) => item.className === className).length + 1;
    const studentNo = `${year}${String(streamIndex(className)).padStart(2, "0")}${String(serial).padStart(3, "0")}`;
    const teacher = CLASS_TEACHERS[className] ?? "班主任";
    students.push({
      id: `s-${className.toLowerCase()}-${String(serial).padStart(2, "0")}`,
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

for (const key of ["id", "studentNo"]) {
  const seen = new Set();
  const duplicates = new Set();
  for (const student of allStudents) {
    if (seen.has(student[key])) duplicates.add(student[key]);
    seen.add(student[key]);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `匯入中止：學生 ${key} 重複：${[...duplicates].slice(0, 10).join("、")}`
    );
  }
}

const output = `// 自動產生：npm run import:roster
import type { Student } from "@/lib/types";

export const ROSTER_STUDENTS: Student[] = ${JSON.stringify(allStudents, null, 2)};
`;

const outPath = path.join(root, "src/data/roster-students.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf8");
console.log(`已匯入 ${allStudents.length} 名學生 → ${outPath}`);
