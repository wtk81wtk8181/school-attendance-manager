"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, FileText, FileWarning, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsv, formatPercent, formatPercentExact, formatShortDate } from "@/lib/format";
import {
  buildStudentStats,
  classLabel,
  formLabel,
  isCountedTowardAbsence,
} from "@/lib/rules";
import { AbsenceDetailFields } from "@/components/absence-detail-fields";
import { DailyAbsenceReport } from "@/components/daily-absence-report";
import { DailyStaffSection } from "@/components/daily-staff-section";
import { documentLabels, reviewLabels, warningStatusLabels, warningTypeLabels } from "@/components/status-badges";
import { buildDailyAbsenceRows, buildDailySchoolReport } from "@/lib/daily-report";
import { hongKongToday, resolveDigestSchoolDay } from "@/lib/digest";
import { buildMonthlyReport, currentYearMonth, monthRange } from "@/lib/monthly-report";
import { EmailRecipientPicker } from "@/components/email-recipient-picker";
import { downloadBase64Xlsx, requestDailyReport, requestMonthlyReport } from "@/lib/digest-client";
import { resolveSendRecipients, persistRecipientEmails } from "@/lib/email-utils";
import { useStore } from "@/lib/store";
import type { FormLevel } from "@/lib/types";
import { toast } from "sonner";

export default function ReportsPage() {
  const {
    state,
    visibleStudents,
    currentUser,
    updateAbsenceDetails,
    upsertRecipient,
  } = useStore();
  const canEditDaily = currentUser?.role === "office";
  const today = hongKongToday();
  const [form, setForm] = useState("all");
  const [klass, setKlass] = useState("all");
  const [from, setFrom] = useState(
    state.academicYear.start <= today ? state.academicYear.start : today
  );
  const [to, setTo] = useState(
    state.academicYear.end >= today ? state.academicYear.end : today
  );
  const [reportDay, setReportDay] = useState(
    resolveDigestSchoolDay(state.absences)
  );
  const [month, setMonth] = useState(currentYearMonth);
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [monthlyEmail, setMonthlyEmail] = useState("");
  const [dailyEmail, setDailyEmail] = useState("");
  const [showMonthlyEmail, setShowMonthlyEmail] = useState(false);
  const [showDailyEmail, setShowDailyEmail] = useState(false);

  const dailyScope =
    klass !== "all"
      ? classLabel(klass)
      : form !== "all"
        ? formLabel(Number(form) as FormLevel)
        : "全校";

  const classes = useMemo(
    () => [...new Set(visibleStudents.map((item) => item.className))].sort(),
    [visibleStudents]
  );

  const filteredStudents = visibleStudents.filter((student) => {
    const matchForm = form === "all" || String(student.form) === form;
    const matchClass = klass === "all" || student.className === klass;
    return matchForm && matchClass;
  });

  const stats = filteredStudents.map((student) =>
    buildStudentStats(student, state.absences, state.academicYear.schoolDays)
  );

  const classSummaries = (() => {
    const groups = new Map<string, typeof stats>();
    for (const item of stats) {
      const list = groups.get(item.student.className) ?? [];
      list.push(item);
      groups.set(item.student.className, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([className, items]) => {
        const attendanceRate =
          items.length === 0
            ? 100
            : items.reduce((sum, item) => sum + item.attendanceRate, 0) / items.length;
        return {
          className,
          studentCount: items.length,
          attendanceRate,
        };
      });
  })();

  const absences = state.absences.filter((item) => {
    const studentOk = filteredStudents.some((student) => student.id === item.studentId);
    return studentOk && item.date >= from && item.date <= to;
  });

  const letters = state.warnings.filter((item) =>
    filteredStudents.some((student) => student.id === item.studentId)
  );

  const dailyRows = buildDailyAbsenceRows(
    filteredStudents,
    state.absences,
    reportDay,
    state.studentLeaveRecords
  );

  const dailySchoolReport = buildDailySchoolReport(
    filteredStudents,
    state.absences,
    reportDay,
    state.staffMembers,
    state.staffDailyAbsences,
    dailyScope,
    state.staffLeaveRecords,
    state.studentLeaveRecords
  );

  const monthlyReport = buildMonthlyReport(visibleStudents, state.absences, month);

  function exportDailyPdf() {
    const params = new URLSearchParams({
      date: reportDay,
      form,
      klass,
    });
    window.open(`/reports/daily/print?${params.toString()}`, "_blank", "noopener,noreferrer");
    toast.success("已開啟每日缺席報告，請在列印視窗選擇「儲存為 PDF」。");
  }

  async function runDailyReport(sendEmail: boolean) {
    if (sendEmail && !showDailyEmail) {
      setShowDailyEmail(true);
      return;
    }

    persistRecipientEmails(dailyEmail, state.digestRecipients, upsertRecipient);
    const recipients = resolveSendRecipients(state.digestRecipients, dailyEmail);
    if (sendEmail && recipients.length === 0) {
      toast.error("請勾選或輸入至少一個電郵地址。");
      return;
    }

    setDailyBusy(true);
    try {
      const result = await requestDailyReport({
        payload: dailySchoolReport,
        sendEmail,
        recipients: sendEmail ? recipients : [],
      });

      if (sendEmail) {
        toast.success(
          `已將 ${formatShortDate(reportDay)} 每日缺席報告電郵予 ${result.recipientCount} 位收件人。`
        );
      } else {
        toast.success(`已產生 ${result.filename}`);
        downloadBase64Xlsx(result.filename, result.fileBase64);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生每日缺席報告。");
    } finally {
      setDailyBusy(false);
    }
  }

  async function runMonthlyReport(sendEmail: boolean) {
    if (sendEmail && !showMonthlyEmail) {
      setShowMonthlyEmail(true);
      return;
    }

    persistRecipientEmails(monthlyEmail, state.digestRecipients, upsertRecipient);
    const recipients = resolveSendRecipients(state.digestRecipients, monthlyEmail);
    if (sendEmail && recipients.length === 0) {
      toast.error("請勾選或輸入至少一個電郵地址。");
      return;
    }

    setMonthlyBusy(true);
    try {
      const result = await requestMonthlyReport({
        payload: monthlyReport,
        sendEmail,
        recipients: sendEmail ? recipients : [],
      });

      if (sendEmail) {
        toast.success(`已將 ${result.filename} 電郵予 ${result.recipientCount} 位收件人。`);
      } else {
        toast.success(`已產生 ${result.filename}`);
        downloadBase64Xlsx(result.filename, result.fileBase64);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生每月報告。");
    } finally {
      setMonthlyBusy(false);
    }
  }

  function exportAttendance() {
    downloadCsv(`各班出席率-${form}-${klass}.csv`, [
      ["班別", "人數", "出席率"],
      ...classSummaries.map((item) => [
        classLabel(item.className),
        item.studentCount,
        item.attendanceRate.toFixed(1),
      ]),
    ]);
    toast.success("已下載各班出席率報告。");
  }

  function exportAbsences() {
    downloadCsv(`缺席記錄統計-${from}-${to}.csv`, [
      ["日期", "班別", "學號", "姓名", "狀態", "日數", "原因", "致電人士", "致電時間", "文件", "是否提交", "審核", "計入缺席"],
      ...absences.map((item) => {
        const student = state.students.find((row) => row.id === item.studentId);
        return [
          item.date,
          student ? classLabel(student.className) : "",
          student?.studentNo ?? "",
          student?.name ?? "",
          item.eclassStatus === "absent"
            ? "缺席"
            : item.eclassStatus === "late"
              ? "遲到"
              : "請假",
          item.days,
          item.reason,
          item.calledBy ?? "",
          item.calledAt ?? "",
          documentLabels[item.documentType],
          item.documentSubmitted ? "已提交" : "未提交",
          reviewLabels[item.reviewStatus],
          isCountedTowardAbsence(item) ? "是" : "否",
        ];
      }),
    ]);
    toast.success("已下載缺席記錄統計。");
  }

  function exportWarnings() {
    downloadCsv("警告信存檔.csv", [
      ["發出日期", "班別", "學號", "姓名", "類型", "當時缺席", "上限", "狀態", "文件編號"],
      ...letters.map((item) => {
        const student = state.students.find((row) => row.id === item.studentId);
        return [
          formatShortDate(item.issuedAt),
          student ? classLabel(student.className) : "",
          student?.studentNo ?? "",
          student?.name ?? "",
          warningTypeLabels[item.type],
          item.triggerDays,
          item.limitDays,
          warningStatusLabels[item.status],
          item.id,
        ];
      }),
    ]);
    toast.success("已下載警告信存檔清單。");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">數據導出與報表</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          可按年級、班別與日期篩選，匯出學校格式每日缺席 Excel／PDF、出席率總表、缺席統計，以及警告信存檔清單。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>篩選</CardTitle>
          <CardDescription>班主任帳號只會匯出其負責班級。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label>年級</Label>
            <Select value={form} onValueChange={(value) => setForm(value ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年級</SelectItem>
                {([1, 2, 3, 4, 5, 6] as FormLevel[]).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {formLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>班別</Label>
            <Select value={klass} onValueChange={(value) => setKlass(value ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班別</SelectItem>
                {classes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {classLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="from">由</Label>
            <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to">至</Label>
            <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">每月各班缺席率報告</CardTitle>
            <CardDescription>
              {monthlyReport.monthLabel}　共 {monthlyReport.classes.length} 班、
              {monthlyReport.rows.length} 筆紀錄
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-month">月份</Label>
              <Input
                id="report-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || currentYearMonth())}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={monthlyBusy} onClick={() => void runMonthlyReport(false)}>
                <Download className="size-4" />
                生成 Excel
              </Button>
              <Button
                variant="outline"
                disabled={monthlyBusy}
                onClick={() => void runMonthlyReport(true)}
              >
                <Mail className="size-4" />
                {showMonthlyEmail ? "確認寄出" : "寄出 Email"}
              </Button>
            </div>
            {showMonthlyEmail ? (
              <EmailRecipientPicker
                idPrefix="monthly"
                extraEmail={monthlyEmail}
                onExtraEmailChange={setMonthlyEmail}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">每日缺席報告</CardTitle>
            <CardDescription>
              {formatShortDate(reportDay)}　全校出席 {formatPercentExact(dailySchoolReport.totalAttendanceRate)}
              ，{dailySchoolReport.totalAbsent} 人缺席或請假
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-day">上課日</Label>
              <Input
                id="report-day"
                type="date"
                value={reportDay}
                onChange={(event) => setReportDay(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={dailyBusy} onClick={() => void runDailyReport(false)}>
                <Download className="size-4" />
                生成 Excel
              </Button>
              <Button variant="outline" onClick={exportDailyPdf}>
                <FileText className="size-4" />
                匯出 PDF
              </Button>
              <Button
                variant="outline"
                disabled={dailyBusy}
                onClick={() => void runDailyReport(true)}
              >
                <Mail className="size-4" />
                {showDailyEmail ? "確認寄出" : "寄出 Email"}
              </Button>
            </div>
            {showDailyEmail ? (
              <EmailRecipientPicker
                idPrefix="daily"
                extraEmail={dailyEmail}
                onExtraEmailChange={setDailyEmail}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">各班出席率</CardTitle>
            <CardDescription>現時篩選範圍共 {classSummaries.length} 班</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportAttendance}>
              <Download className="size-4" />
              下載 CSV
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">缺席記錄統計</CardTitle>
            <CardDescription>
              {formatShortDate(from)} 至 {formatShortDate(to)}，共 {absences.length} 筆
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportAbsences}>
              <Download className="size-4" />
              下載 CSV
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">警告信存檔</CardTitle>
            <CardDescription>共 {letters.length} 封，可於平台列印 PDF</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={exportWarnings}>
              <Download className="size-4" />
              下載清單
            </Button>
            <Button variant="outline" render={<Link href="/warnings" />}>
              <FileWarning className="size-4" />
              開啟存檔
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <DailyStaffSection date={reportDay} />
      </div>

      <div className="overflow-auto rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">學校格式預覽</p>
            <p className="text-xs text-muted-foreground">
              含各班出席、缺席名單、年級百分比、守時百分比及教職員缺席情況
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportDailyPdf}>
            <FileText className="size-4" />
            匯出 PDF
          </Button>
        </div>
        <DailyAbsenceReport payload={dailySchoolReport} />
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="font-medium">每日缺席名單預覽</p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(reportDay)}
              {canEditDaily
                ? "　職員可選擇或填寫請假原因、致電人士及致電時間"
                : "　學生姓名、請假原因、致電人士及致電時間"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportDailyPdf}>
            <FileText className="size-4" />
            匯出 PDF
          </Button>
        </div>
        {dailyRows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            該日沒有缺席或請假紀錄。可改選其他上課日。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班別</TableHead>
                <TableHead>學生姓名</TableHead>
                <TableHead>請假／缺席原因</TableHead>
                <TableHead>致電到校人士</TableHead>
                <TableHead>致電時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.classLabel}</TableCell>
                  <TableCell>
                    {row.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.studentNo}　{row.status}
                    </span>
                  </TableCell>
                  {canEditDaily ? (
                    <AbsenceDetailFields
                      compact
                      asCells
                      reason={row.reason}
                      calledBy={row.calledBy === "尚未致電" ? "" : row.calledBy}
                      calledAt={row.calledAt === "—" ? "" : row.calledAt}
                      onChange={(next) => updateAbsenceDetails(row.id, next)}
                    />
                  ) : (
                    <>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>{row.calledBy}</TableCell>
                      <TableCell>{row.calledAt}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <p className="font-medium">各班出席率</p>
          <p className="text-xs text-muted-foreground">只顯示每班人數與全班平均出席率</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>班別</TableHead>
              <TableHead>人數</TableHead>
              <TableHead>出席率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classSummaries.map((item) => (
              <TableRow key={item.className}>
                <TableCell>{classLabel(item.className)}</TableCell>
                <TableCell>{item.studentCount} 人</TableCell>
                <TableCell>{formatPercent(item.attendanceRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <p className="font-medium">每月各班缺席率（{monthlyReport.monthLabel}）</p>
          <p className="text-xs text-muted-foreground">
            {formatShortDate(monthRange(month).start)} 至{" "}
            {formatShortDate(monthRange(month).end)}　獲批請假不計入；遲到另行統計次數
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>班別</TableHead>
              <TableHead>班主任</TableHead>
              <TableHead>人數</TableHead>
              <TableHead>缺席次數</TableHead>
              <TableHead>遲到次數</TableHead>
              <TableHead>請假人次</TableHead>
              <TableHead>計入缺席（天）</TableHead>
              <TableHead>平均出席率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyReport.classes.map((item) => (
              <TableRow key={item.className}>
                <TableCell>{item.classLabel}</TableCell>
                <TableCell>{item.teacher}</TableCell>
                <TableCell>{item.studentCount} 人</TableCell>
                <TableCell>{item.absentCount}</TableCell>
                <TableCell>{item.lateCount}</TableCell>
                <TableCell>{item.leaveCount}</TableCell>
                <TableCell>{item.countedAbsenceDays}</TableCell>
                <TableCell>{formatPercent(item.attendanceRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
