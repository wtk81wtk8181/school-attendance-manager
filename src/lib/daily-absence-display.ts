/** 缺席名單達此數量起改為雙欄；再多才三欄 */
export const DAILY_ABSENCE_TWO_COLUMN_AT = 7;
export const DAILY_ABSENCE_THREE_COLUMN_AT = 13;

const MIN_CLASS_ROWS = 3;

export interface ExcelAbsenceLayout {
  columnCount: 1 | 2 | 3;
  columns: string[][];
  excelFontSize: number;
  rowSpan: number;
  rowHeight: number;
  charsPerColumn: number;
}

function columnCountForAbsence(lineCount: number): 1 | 2 | 3 {
  if (lineCount < DAILY_ABSENCE_TWO_COLUMN_AT) return 1;
  if (lineCount < DAILY_ABSENCE_THREE_COLUMN_AT) return 2;
  return 3;
}

export function pdfAbsenceFontSize(lineCount: number): number {
  if (lineCount <= 6) return 9;
  if (lineCount <= 10) return 8;
  if (lineCount <= 14) return 7;
  return 6;
}

export function pdfAbsenceColumnCount(lineCount: number): 1 | 2 | 3 {
  return columnCountForAbsence(lineCount);
}

function charsPerColumnForCount(columnCount: 1 | 2 | 3): number {
  if (columnCount === 1) return 22;
  if (columnCount === 2) return 11;
  return 8;
}

function excelFontSizeFor(lineCount: number, columnCount: 1 | 2 | 3): number {
  if (columnCount === 1) {
    if (lineCount <= 6) return 8;
    return 7;
  }
  if (columnCount === 2) {
    if (lineCount <= 10) return 7;
    if (lineCount <= 14) return 6;
    return 5;
  }
  if (lineCount <= 16) return 6;
  if (lineCount <= 20) return 5;
  return 4;
}

function estimateWrappedLines(line: string, charsPerLine: number): number {
  const length = Math.max(line.length, 1);
  return Math.max(1, Math.ceil(length / charsPerLine));
}

export function splitAbsenceLinesIntoColumns(
  lines: string[],
  columnCount: 1 | 2 | 3
): string[][] {
  if (lines.length === 0) return [[]];
  if (columnCount === 1) return [lines];

  const columns: string[][] = Array.from({ length: columnCount }, () => []);
  const baseSize = Math.floor(lines.length / columnCount);
  const remainder = lines.length % columnCount;
  let offset = 0;

  for (let index = 0; index < columnCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    columns[index] = lines.slice(offset, offset + size);
    offset += size;
  }

  return columns;
}

export function excelAbsenceLayout(lines: string[]): ExcelAbsenceLayout {
  const columnCount = columnCountForAbsence(lines.length);
  const columns = splitAbsenceLinesIntoColumns(lines, columnCount);
  const charsPerColumn = charsPerColumnForCount(columnCount);
  const excelFontSize = excelFontSizeFor(lines.length, columnCount);

  const maxContentLines = Math.max(
    ...columns.map((column) =>
      column.reduce((sum, line) => sum + estimateWrappedLines(line, charsPerColumn), 0)
    ),
    1
  );
  const rowSpan = Math.max(MIN_CLASS_ROWS, maxContentLines);
  const rowHeight = Math.max(14, Math.ceil(excelFontSize * 1.75) + 2);

  return {
    columnCount,
    columns,
    excelFontSize,
    rowSpan,
    rowHeight,
    charsPerColumn,
  };
}

/** 網頁／PDF 用 */
export function absenceDisplayMeta(lineCount: number) {
  const columnCount = columnCountForAbsence(lineCount);
  const fontSizePx =
    lineCount <= 6 ? 11 : lineCount <= 10 ? 9 : lineCount <= 14 ? 8 : 7;

  return {
    columns: columnCount,
    fontSizePx,
    rowSpan: excelAbsenceLayout(Array(lineCount).fill("x")).rowSpan,
  };
}

export function splitAbsenceLines(lines: string[]): [string[], string[]] {
  const [left, right] = splitAbsenceLinesIntoColumns(lines, 2);
  return [left, right];
}

export function rowHeightForBlock(rowSpan: number, lineCount: number): number {
  const layout = excelAbsenceLayout(
    Array.from({ length: lineCount }, (_, index) => `學生${index + 1}`)
  );
  return layout.rowHeight;
}

export function absenceColRanges(
  absencesStart: number,
  absencesEnd: number,
  columnCount: 1 | 2 | 3
): Array<[number, number]> {
  const total = absencesEnd - absencesStart + 1;
  const width = Math.floor(total / columnCount);
  const ranges: Array<[number, number]> = [];
  let start = absencesStart;

  for (let index = 0; index < columnCount; index += 1) {
    const end = index === columnCount - 1 ? absencesEnd : start + width - 1;
    ranges.push([start, end]);
    start = end + 1;
  }

  return ranges;
}
