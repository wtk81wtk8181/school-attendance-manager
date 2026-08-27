import ExcelJS from "exceljs";
import { SCHOOL_NAME } from "@/lib/seed";
import type { AppearanceReportPayload } from "@/lib/appearance-report";
import { unzipToMap, zipFromMap } from "@/lib/zip-xlsx";

const NAVY = "1B365D";
const HEADER_FILL = "D9E2F3";
const THIN: ExcelJS.BorderStyle = "thin";
const BLACK = { argb: "FF000000" };
const PERCENT_FMT = "0.00%";
const CLASS_START = 5;
const CLASS_END = 34;
const TOTAL_ROW = 35;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: THIN, color: BLACK },
  left: { style: THIN, color: BLACK },
  right: { style: THIN, color: BLACK },
  bottom: { style: THIN, color: BLACK },
};

export async function buildAppearanceWorkbook(
  payload: AppearanceReportPayload
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sheet1", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      printArea: "A1:O58",
    },
  });

  sheet.columns = [
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  sheet.mergeCells("A1:D1");
  const title = sheet.getCell("A1");
  title.value = `${SCHOOL_NAME}（${payload.academicYear}）`;
  title.font = { bold: true, size: 16, color: { argb: `FF${NAVY}` } };
  title.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A2:D2");
  const subtitle = sheet.getCell("A2");
  subtitle.value = `（${payload.monthLabel}）各班出席表現及儀容百份比報告`;
  subtitle.font = { bold: true, size: 14, color: { argb: `FF${NAVY}` } };
  subtitle.alignment = { horizontal: "center", vertical: "middle" };

  const headers = ["班別", "守時百分率", "出席百分率", "校服儀容百分率"];
  headers.forEach((label, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_FILL}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  });

  payload.classes.forEach((item, index) => {
    const row = CLASS_START + index;
    writeClassCell(sheet.getCell(row, 1), item.className, false);
    writePercentCell(sheet.getCell(row, 2), item.punctualityRate);
    writePercentCell(sheet.getCell(row, 3), item.attendanceRate);
    writePercentCell(sheet.getCell(row, 4), item.appearanceRate);
  });

  writeClassCell(sheet.getCell(TOTAL_ROW, 1), "總百份比", true);
  writeFormulaCell(sheet.getCell(TOTAL_ROW, 2), `AVERAGE(B${CLASS_START}:B${CLASS_END})`);
  writeFormulaCell(sheet.getCell(TOTAL_ROW, 3), `AVERAGE(C${CLASS_START}:C${CLASS_END})`);
  writeFormulaCell(sheet.getCell(TOTAL_ROW, 4), `AVERAGE(D${CLASS_START}:D${CLASS_END})`);

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 22;
  sheet.getRow(4).height = 20;

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const titleText = `${payload.academicYear}學年 ${payload.monthLabel}各班出席表現及儀容百分率`;
  return attachAppearanceChart(buffer, titleText);
}

function writeClassCell(cell: ExcelJS.Cell, value: string, bold: boolean) {
  cell.value = value;
  cell.font = { bold };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = THIN_BORDER;
}

function writePercentCell(cell: ExcelJS.Cell, value: number | null) {
  if (value === null) {
    cell.value = null;
  } else {
    cell.value = value;
    cell.numFmt = PERCENT_FMT;
  }
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = THIN_BORDER;
}

function writeFormulaCell(cell: ExcelJS.Cell, formula: string) {
  cell.value = { formula };
  cell.numFmt = PERCENT_FMT;
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = THIN_BORDER;
}

function attachAppearanceChart(buffer: Buffer, title: string): Buffer {
  try {
    const files = unzipToMap(buffer);
    const sheetPath = "xl/worksheets/sheet1.xml";
    const sheetXml = files.get(sheetPath)?.toString("utf8");
    if (!sheetXml) return buffer;

    files.set(sheetPath, Buffer.from(ensureSheetDrawing(sheetXml), "utf8"));
    const existingRels = files.get("xl/worksheets/_rels/sheet1.xml.rels")?.toString("utf8");
    files.set(
      "xl/worksheets/_rels/sheet1.xml.rels",
      Buffer.from(mergeSheetRels(existingRels), "utf8")
    );
  files.set("xl/drawings/drawing1.xml", Buffer.from(drawingXml(), "utf8"));
  files.set(
    "xl/drawings/_rels/drawing1.xml.rels",
    Buffer.from(drawingRelsXml(), "utf8")
  );
  files.set("xl/charts/chart1.xml", Buffer.from(chartXml(title), "utf8"));

  const typesPath = "[Content_Types].xml";
  const types = files.get(typesPath)?.toString("utf8") ?? "";
  files.set(
    typesPath,
    Buffer.from(
      upsertContentTypes(types, [
        [
          "/xl/drawings/drawing1.xml",
          "application/vnd.openxmlformats-officedocument.drawing+xml",
        ],
        [
          "/xl/charts/chart1.xml",
          "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
        ],
      ]),
      "utf8"
    )
  );

    return zipFromMap(files);
  } catch {
    return buffer;
  }
}

function mergeSheetRels(existing: string | undefined) {
  if (!existing) return sheetRelsXml();
  if (existing.includes("drawings/drawing1.xml")) return existing;
  return existing.replace(
    "</Relationships>",
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
  );
}

function ensureSheetDrawing(xml: string): string {
  if (xml.includes("<drawing ")) return xml;
  return xml.replace(
    "</worksheet>",
    `<drawing r:id="rId1"/></worksheet>`
  );
}

function upsertContentTypes(xml: string, parts: Array<[string, string]>): string {
  let next = xml;
  for (const [partName, contentType] of parts) {
    if (next.includes(`PartName="${partName}"`)) continue;
    next = next.replace(
      "</Types>",
      `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`
    );
  }
  return next;
}

function sheetRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
}

function drawingRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`;
}

function drawingXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>36</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>58</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr><xdr:graphicFrameLocks/></xdr:cNvGraphicFramePr></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
}

function chartXml(title: string) {
  const safeTitle = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="zh-TW"/>
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1400" b="1"/></a:pPr><a:r><a:rPr lang="zh-TW" sz="1400" b="1"/><a:t>${safeTitle}</a:t></a:r></a:p></c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        ${chartSeries(0, "B", "C0C0C0")}
        ${chartSeries(1, "C", "5B9BD5")}
        ${chartSeries(2, "D", "C4A35A")}
        <c:axId val="1"/>
        <c:axId val="2"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="1"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="2"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="2"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorGridlines/>
        <c:numFmt formatCode="0%" sourceLinked="0"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="1"/>
        <c:crosses val="autoZero"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function chartSeries(index: number, column: string, color: string) {
  return `<c:ser>
    <c:idx val="${index}"/>
    <c:order val="${index}"/>
    <c:tx><c:strRef><c:f>Sheet1!$${column}$4</c:f></c:strRef></c:tx>
    <c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr>
    <c:invertIfNegative val="0"/>
    <c:cat><c:strRef><c:f>Sheet1!$A$5:$A$34</c:f></c:strRef></c:cat>
    <c:val><c:numRef><c:f>Sheet1!$${column}$5:$${column}$34</c:f></c:numRef></c:val>
  </c:ser>`;
}
