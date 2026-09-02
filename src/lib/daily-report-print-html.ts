import { formatPercentExact } from "@/lib/format";
import {
  pdfAbsenceColumnCount,
  pdfAbsenceFontSize,
  splitAbsenceLinesIntoColumns,
} from "@/lib/daily-absence-display";
import { STAFF_ABSENCE_ROWS } from "@/lib/staff";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import type { DailyClassBlock, DailySchoolReportPayload } from "@/lib/daily-report";

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 194mm;
    font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
    color: #18181b;
    background: #fff;
  }
  .daily-print-shell {
    width: 194mm;
    height: 281mm;
    max-height: 281mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    position: relative;
  }
  .daily-print-shell:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .daily-print-page {
    width: 194mm;
    transform-origin: top left;
  }
  .header {
    border-bottom: 2px solid #1b365d;
    padding-bottom: 8px;
    text-align: center;
  }
  .header-en {
    font-size: 10px;
    letter-spacing: 0.28em;
    color: #c9a227;
    margin: 0;
  }
  .header-school {
    margin: 2px 0 0;
    font-size: 18px;
    letter-spacing: 0.12em;
    color: #1b365d;
  }
  .header-title {
    margin: 3px 0 0;
    font-size: 13px;
    font-weight: 600;
  }
  .header-date {
    margin: 2px 0 0;
    font-size: 11px;
  }
  .header-section {
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: #1b365d;
  }
  .class-stack {
    margin-top: 10px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  .table th, .table td {
    border: 1px solid #d4d4d8;
    padding: 2px 4px;
    vertical-align: top;
  }
  .table th {
    background: #f1f5f9;
    text-align: center;
    font-weight: 600;
  }
  .table .center { text-align: center; }
  .table .left { text-align: left; }
  .table .muted { color: #a1a1aa; }
  .staff-box, .stats-box, .metrics-box {
    margin-top: 6px;
    border: 1px solid #d4d4d8;
    overflow: visible;
  }
  .staff-box { padding: 6px 8px; }
  .staff-box h3, .metrics-title {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
  }
  .staff-line {
    margin: 4px 0 0;
    font-size: 10px;
  }
  .metrics-title {
    padding: 3px 6px;
    text-align: center;
    background: #f8fafc;
    border-bottom: 1px solid #d4d4d8;
  }
  .metrics-table {
    table-layout: fixed;
    font-size: 7.5px;
  }
  .metrics-table th, .metrics-table td {
    padding: 3px 2px;
    vertical-align: middle;
    text-align: center;
    white-space: nowrap;
    word-break: keep-all;
    overflow: hidden;
  }
  .metrics-table col.label { width: 22mm; }
  .metrics-table .label {
    width: 22mm;
    text-align: left;
    white-space: nowrap;
    word-break: keep-all;
    overflow: visible;
  }
  .space-y { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
  .absence-cols {
    display: grid;
    gap: 4px;
  }
  .absence-line { line-height: 1.25; }
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHeader(payload: DailySchoolReportPayload, sectionTitle: string): string {
  return `
    <header class="header">
      <p class="header-en">${escapeHtml(SCHOOL_NAME_EN)}</p>
      <h1 class="header-school">${escapeHtml(SCHOOL_NAME)}</h1>
      <h2 class="header-title">學生缺席每日報告表</h2>
      <p class="header-date">${escapeHtml(payload.dateLabel)}</p>
      <p class="header-section">${escapeHtml(sectionTitle)}</p>
    </header>
  `;
}

function renderAbsenceCell(lines: string[]): string {
  if (lines.length === 0) {
    return '<span class="muted">—</span>';
  }

  const columnCount = pdfAbsenceColumnCount(lines.length);
  const fontSize = pdfAbsenceFontSize(lines.length);
  const columns = splitAbsenceLinesIntoColumns(lines, columnCount);

  const renderColumn = (columnLines: string[]) =>
    columnLines
      .map((line) => `<div class="absence-line">${escapeHtml(line)}</div>`)
      .join("");

  if (columnCount === 1) {
    return `<div style="font-size:${fontSize}px">${renderColumn(lines)}</div>`;
  }

  return `
    <div class="absence-cols" style="font-size:${fontSize}px;grid-template-columns:repeat(${columnCount},minmax(0,1fr))">
      ${columns.map((column) => `<div>${renderColumn(column)}</div>`).join("")}
    </div>
  `;
}

function renderClassColumn(blocks: DailyClassBlock[]): string {
  const rows = blocks
    .map(
      (block) => `
        <tr>
          <td class="center"><strong>${escapeHtml(block.className)}</strong></td>
          <td class="center">${block.registered || ""}</td>
          <td class="center">${block.present}</td>
          <td class="center">${block.earlyLeave || ""}</td>
          <td class="left">${renderAbsenceCell(block.absenceLines)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="table">
      <thead>
        <tr>
          <th>班別代碼</th>
          <th>學生總人數</th>
          <th>出席</th>
          <th>早退</th>
          <th class="left">缺席名單及原因</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderStaffSection(payload: DailySchoolReportPayload): string {
  const lines = STAFF_ABSENCE_ROWS.map(
    (row) => `
      <p class="staff-line">
        <strong>${escapeHtml(row.label)}：</strong>
        ${
          payload.staff[row.kind].length > 0
            ? escapeHtml(payload.staff[row.kind].join("、"))
            : "—"
        }
      </p>
    `
  ).join("");

  return `
    <section class="staff-box">
      <h3>教職員缺席情況</h3>
      ${lines}
    </section>
  `;
}

function renderFormStats(payload: DailySchoolReportPayload): string {
  const headerCells = payload.formStats
    .map((item) => `<th>${escapeHtml(item.label)}</th>`)
    .join("");

  const presentCells = payload.formStats
    .map((item) => `<td>${item.present}</td>`)
    .join("");
  const registeredCells = payload.formStats
    .map((item) => `<td>${item.registered}</td>`)
    .join("");
  const rateCells = payload.formStats
    .map((item) => `<td>${escapeHtml(formatPercentExact(item.attendanceRate))}</td>`)
    .join("");

  return `
    <section class="stats-box">
      <table class="table">
        <thead>
          <tr>
            <th class="left">級別</th>
            ${headerCells}
            <th>總數</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="left">學生出席人數</td>
            ${presentCells}
            <td><strong>${payload.totalPresent}</strong></td>
          </tr>
          <tr>
            <td class="left">學生註冊人數</td>
            ${registeredCells}
            <td><strong>${payload.totalRegistered}</strong></td>
          </tr>
          <tr>
            <td class="left">學生出席百分比</td>
            ${rateCells}
            <td><strong>${escapeHtml(formatPercentExact(payload.totalAttendanceRate))}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderClassMetrics(
  title: string,
  classes: DailyClassBlock[],
  totalLabel: string,
  totals: {
    absent: number;
    attendanceRate: number;
    late: number;
    punctualityRate: number;
  }
): string {
  const headerCells = classes
    .map((item) => `<th>${escapeHtml(item.className)}</th>`)
    .join("");

  const absentCells = classes
    .map((item) => `<td>${item.absentCount || ""}</td>`)
    .join("");
  const attendanceCells = classes
    .map((item) => `<td>${escapeHtml(formatPercentExact(item.attendanceRate))}</td>`)
    .join("");
  const lateCells = classes.map((item) => `<td>${item.lateCount}</td>`).join("");
  const punctualityCells = classes
    .map((item) => `<td>${escapeHtml(formatPercentExact(item.punctualityRate))}</td>`)
    .join("");

  return `
    <section class="metrics-box">
      <h3 class="metrics-title">${escapeHtml(title)}</h3>
      <table class="table metrics-table">
        <colgroup>
          <col class="label" />
        </colgroup>
        <thead>
          <tr>
            <th class="label">班別</th>
            ${headerCells}
            <th>${escapeHtml(totalLabel)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">缺席人數</td>
            ${absentCells}
            <td>${totals.absent}</td>
          </tr>
          <tr>
            <td class="label">出席百分比</td>
            ${attendanceCells}
            <td>${escapeHtml(formatPercentExact(totals.attendanceRate))}</td>
          </tr>
          <tr>
            <td class="label">遲到人數</td>
            ${lateCells}
            <td>${totals.late}</td>
          </tr>
          <tr>
            <td class="label">守時百分比</td>
            ${punctualityCells}
            <td>${escapeHtml(formatPercentExact(totals.punctualityRate))}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderJuniorPage(payload: DailySchoolReportPayload): string {
  const junior = payload.classes.slice(0, 15);

  return `
    <div class="daily-print-shell">
      <article class="daily-print-page">
        ${renderHeader(payload, "中一至中三")}
        <div class="class-stack">
          ${renderClassColumn(junior)}
        </div>
        ${renderStaffSection(payload)}
      </article>
    </div>
  `;
}

function renderSeniorPage(payload: DailySchoolReportPayload): string {
  const senior = payload.classes.slice(15, 30);

  return `
    <div class="daily-print-shell">
      <article class="daily-print-page">
        ${renderHeader(payload, "中四至中六")}
        <div class="class-stack">
          ${renderClassColumn(senior)}
        </div>
        <div class="space-y">
          ${renderFormStats(payload)}
          ${renderClassMetrics("中四至中六", senior, "TOTAL", {
            absent: payload.totalAbsent,
            attendanceRate: payload.totalAttendanceRate,
            late: payload.totalLate,
            punctualityRate: payload.schoolPunctualityRate,
          })}
        </div>
      </article>
    </div>
  `;
}

export function buildDailyReportHtml(payload: DailySchoolReportPayload): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <style>${PRINT_CSS}</style>
  </head>
  <body>
    ${renderJuniorPage(payload)}
    ${renderSeniorPage(payload)}
  </body>
</html>`;
}
