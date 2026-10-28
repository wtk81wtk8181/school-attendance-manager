import {
  formatSummaryTotal,
  type StudentAbsenceReport,
} from "@/lib/student-absence-report";

const sheetCss = `
.student-report-preview {
  color: #111;
}
.student-report-page {
  width: 186mm;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  background: #fff;
  color: #111;
  padding: 8mm 10mm 10mm;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
  font-family: PMingLiU, "MingLiU", "Songti TC", "Microsoft JhengHei", "微軟正黑體", serif;
  font-size: 13px;
  line-height: 1.45;
}
.student-report-page h1,
.student-report-page h2,
.student-report-page h3,
.student-report-page p {
  margin: 0;
}
.student-report-top,
.student-report-year {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.student-report-page h1 {
  margin-top: 4px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.student-report-page h2 {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}
.student-report-year {
  margin-top: 8px;
}
.student-report-meta {
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
}
.student-report-meta th,
.student-report-meta td {
  padding: 1px 8px 1px 0;
  font-weight: 400;
  text-align: left;
  vertical-align: baseline;
}
.student-report-meta th {
  width: 6.2em;
  white-space: nowrap;
}
.student-report-meta td {
  width: 34%;
  font-weight: 700;
}
.student-report-page h3 {
  margin: 12px 0 4px;
  font-size: 14px;
  font-weight: 700;
}
.student-report-table,
.student-report-summary {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.student-report-table {
  margin-top: 8px;
}
.student-report-table th,
.student-report-table td,
.student-report-summary th,
.student-report-summary td {
  border: 1px solid #111;
  padding: 3px 6px;
  vertical-align: middle;
  word-break: break-word;
}
.student-report-table th,
.student-report-summary th {
  font-weight: 700;
  text-align: center;
}
.student-report-table td {
  text-align: center;
}
.student-report-table td.student-report-text {
  text-align: left;
}
.student-report-summary {
  width: 86%;
  margin-top: 0;
}
.student-report-summary td:first-child {
  width: 8em;
  text-align: center;
}
.student-report-end {
  margin-top: 22px;
  text-align: center;
  letter-spacing: 0.2em;
  font-weight: 700;
}
@media print {
  .student-report-preview {
    margin: 0 !important;
  }
  .student-report-page {
    width: auto;
    max-width: none;
    margin: 0;
    padding: 0;
    box-shadow: none;
    break-after: page;
    page-break-after: always;
  }
  .student-report-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  .student-report-table tr,
  .student-report-summary {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;

export function StudentAbsenceReportPreview({ report }: { report: StudentAbsenceReport }) {
  const pageCount = report.pages.length;

  return (
    <div className="student-report-preview space-y-6">
      <style>{sheetCss}</style>
      {report.pages.map((page, index) => {
        const pageNo = index + 1;
        const showTable = page.rows.length > 0 || pageCount === 1;
        return (
          <article key={`${report.studentName}-${pageNo}`} className="student-report-page">
            <div className="student-report-top">
              <span>{report.formCode}</span>
              <span>日期：{report.reportDateLabel}</span>
            </div>
            <h1>{report.schoolName}</h1>
            <h2>{report.title}</h2>
            <div className="student-report-year">
              <span>學年　　：{report.academicYearLabel}</span>
              <span>
                第{pageNo}頁/共{pageCount}頁
              </span>
            </div>

            {pageNo === 1 ? (
              <table className="student-report-meta">
                <tbody>
                  <tr>
                    <th>學生姓名</th>
                    <td colSpan={3}>：{report.studentName}</td>
                  </tr>
                  <tr>
                    <th>學校級別</th>
                    <td>：{report.schoolLevel}</td>
                    <th>學校授課制</th>
                    <td>：{report.schoolSession}</td>
                  </tr>
                  <tr>
                    <th>級別</th>
                    <td>：{report.formLabel}</td>
                    <th>班別</th>
                    <td>：{report.className}</td>
                  </tr>
                  <tr>
                    <th>班號</th>
                    <td colSpan={3}>：{report.classNumber}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {pageNo === 1 ? <h3>缺席紀錄細節({report.academicYearLabel}年)</h3> : null}

            {showTable ? (
              <table className="student-report-table">
                <thead>
                  <tr>
                    <th style={{ width: "18%" }}>日期</th>
                    <th style={{ width: "14%" }}>點算時段</th>
                    <th style={{ width: "12%" }}>類別</th>
                    <th style={{ width: "10%" }}>豁免</th>
                    <th style={{ width: "24%" }}>原因</th>
                    <th style={{ width: "22%" }}>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>沒有紀錄</td>
                    </tr>
                  ) : (
                    page.rows.map((row, rowIndex) => (
                      <tr key={`${row.date}-${row.session}-${row.category}-${rowIndex}`}>
                        <td>{row.dateLabel}</td>
                        <td>{row.session}</td>
                        <td>{row.category}</td>
                        <td>{row.exempt ? "是" : "否"}</td>
                        <td className="student-report-text">{row.reason}</td>
                        <td className="student-report-text">{row.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}

            {page.showSummary ? (
              <>
                <h3>摘要</h3>
                <table className="student-report-summary">
                  <thead>
                    <tr>
                      <th>缺席類別</th>
                      <th>總數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.summary.map((line) => (
                      <tr key={line.category}>
                        <td>{line.category}</td>
                        <td>{formatSummaryTotal(line)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="student-report-end">*** 完 ***</p>
              </>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
