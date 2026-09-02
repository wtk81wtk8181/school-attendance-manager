import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const rosterDir = path.join(root, "新增資料夾");

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
  if (typeof value === "object" && value.text) return String(value.text).trim();
  if (typeof value === "object" && value.result != null) return String(value.result).trim();
  return String(value).trim();
}

function normalizeHeader(value) {
  return cellText(value).replace(/\s+/g, "");
}

function streamIndex(className) {
  const stream = className.slice(-1).toUpperCase();
  return "ABCDE".indexOf(stream) + 1;
}

function headerMap(worksheet) {
  const row = worksheet.getRow(1);
  const map = {};
  row.eachCell((cell, col) => {
    const key = normalizeHeader(cell.value);
    if (key) map[key] = col;
  });
  return map;
}

function classCol(headers) {
  return headers["班別代碼"] ?? headers["班別"] ?? null;
}

function parseRegistrySheet(worksheet, fallbackForm) {
  const headers = headerMap(worksheet);
  const classColumn = classCol(headers);
  const nameEnCol = headers["英文姓名"];
  const nameCol = headers["中文姓名"];
  const noCol = headers["班號"];
  if (!classColumn || !nameEnCol || !nameCol || !noCol) {
    throw new Error(`工作表「${worksheet.name}」缺少班別／姓名／班號欄`);
  }

  const students = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const classCode = cellText(row.getCell(classColumn).value).toUpperCase();
    const nameEn = cellText(row.getCell(nameEnCol).value);
    const name = cellText(row.getCell(nameCol).value);
    const classNo = Number(cellText(row.getCell(noCol).value) || 0);
    const form = Number(classCode[0]) || fallbackForm;

    if (!/^\d[A-E]$/.test(classCode) || !nameEn || !name || !classNo) continue;

    const className = classCode;
    const year = String(26 - form).padStart(2, "0");
    const serial = String(classNo).padStart(2, "0");
    let id = `s-${className.toLowerCase()}-${serial}`;
    let studentNo = `${year}${String(streamIndex(className)).padStart(2, "0")}${String(classNo).padStart(3, "0")}`;
    if (students.some((item) => item.id === id)) {
      const suffix = cellText(row.getCell(headers["學生註冊編號"] ?? 1).value) || String(rowIndex);
      id = `${id}-${suffix}`;
      studentNo = `${studentNo}-${suffix.slice(-4)}`;
    }
    const teacher = CLASS_TEACHERS[className] ?? "班主任";
    students.push({
      id,
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

function pickWorksheet(workbook) {
  const byName = workbook.getWorksheet("學生編號");
  if (byName) return byName;
  for (const worksheet of workbook.worksheets) {
    const headers = headerMap(worksheet);
    if (headers["中文姓名"] && classCol(headers) && headers["班號"]) {
      return worksheet;
    }
  }
  return null;
}

const sources = [
  { file: "2627- S.1學生名單.xlsx", form: 1 },
  { file: "2627- S.2學生名單(此為準).xlsx", form: 2 },
  { file: "2627-S.3學生名單(此為準).xlsx", form: 3 },
  { file: "2627- S.4學生名單.xlsx", form: 4 },
  { file: "2627- S.5學生名單.xlsx", form: 5 },
  { file: "2627- S.6學生名單.xlsx", form: 6 },
];

const allStudents = [];
for (const source of sources) {
  const filePath = path.join(rosterDir, source.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到檔案：${source.file}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = pickWorksheet(workbook);
  if (!worksheet) {
    throw new Error(`找不到可用工作表（${source.file}）`);
  }
  const parsed = parseRegistrySheet(worksheet, source.form);
  console.log(`${source.file}／${worksheet.name}：${parsed.length} 人`);
  allStudents.push(...parsed);
}

allStudents.sort(
  (left, right) =>
    left.className.localeCompare(right.className) ||
    left.studentNo.localeCompare(right.studentNo)
);

for (const key of ["id", "studentNo"]) {
  const seen = new Map();
  const duplicates = [];
  for (const student of allStudents) {
    if (seen.has(student[key])) {
      duplicates.push([seen.get(student[key]), student]);
    } else {
      seen.set(student[key], student);
    }
  }
  if (duplicates.length > 0) {
    console.error(JSON.stringify(duplicates.slice(0, 5), null, 2));
    throw new Error(
      `匯入中止：學生 ${key} 重複：${duplicates.map((pair) => pair[1][key]).slice(0, 10).join("、")}`
    );
  }
}

const byClass = new Map();
for (const student of allStudents) {
  byClass.set(student.className, (byClass.get(student.className) ?? 0) + 1);
}
console.log(
  "各班人數：",
  [...byClass.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cls, count]) => `${cls}:${count}`)
    .join(" ")
);

const output = `// 自動產生：npm run import:roster
import type { Student } from "@/lib/types";

export const ROSTER_STUDENTS: Student[] = ${JSON.stringify(allStudents, null, 2)};
`;

const outPath = path.join(root, "src/data/roster-students.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf8");
console.log(`已匯入 ${allStudents.length} 名學生 → ${outPath}`);
