"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, FileWarning, Percent, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AbsenceTable } from "@/components/absence-table";
import { EmptyState } from "@/components/empty-state";
import { LevelBadge, WarningStatusBadge, WarningTypeBadge } from "@/components/status-badges";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatPercent } from "@/lib/format";
import {
  buildStudentStats,
  classLabel,
  formatDays,
  formatWarningTrigger,
  progressPercent,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function StudentDetail({ id }: { id: string }) {
  const { state, visibleStudents, currentUser } = useStore();
  const student = visibleStudents.find((item) => item.id === id);

  if (!student) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="找不到這位學生"
        description="你沒有權限檢視此學生，或學生編號不正確。班主任只能查看自己班級。"
      />
    );
  }

  const stats = buildStudentStats(student, state.absences, state.academicYear.schoolDays);
  const records = state.absences
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const letters = state.warnings
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/students" />}>
            <ArrowLeft className="size-3.5" />
            返回名單
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.name}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {student.nameEn}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classLabel(student.className)}　學號 {student.studentNo}　班主任 {student.homeroomTeacherName}
            {currentUser?.role === "homeroom" ? "　（唯讀）" : ""}
          </p>
        </div>
        <LevelBadge level={stats.level} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="出席率"
          value={formatPercent(stats.attendanceRate)}
          hint={`上課 ${state.academicYear.schoolDays} 天`}
          icon={Percent}
          tone="success"
        />
        <StatCard
          label="計入缺席"
          value={`${formatDays(stats.countedDays)} 天`}
          hint={`上限 ${formatDays(stats.limit)} 天・預警線 ${formatDays(stats.warningThreshold)} 天`}
          icon={CalendarDays}
          tone={stats.level === "over" ? "danger" : stats.level === "warning" ? "warning" : "default"}
        />
        <StatCard
          label="獲批請假"
          value={`${formatDays(stats.approvedLeaveDays)} 天`}
          hint="不影響出席率，不計入上限"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="警告信"
          value={`${letters.length} 封`}
          hint={letters.some((item) => item.status === "issued") ? "尚有信件待校務處跟進" : "沒有待跟進信件"}
          icon={FileWarning}
          tone={letters.some((item) => item.status === "issued") ? "warning" : "default"}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>缺席上限進度</CardTitle>
          <CardDescription>
            無故缺席與未批准請假會累積至此。達一半上限即自動發出警告信並通知校務處。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full rounded-full",
                stats.level === "over"
                  ? "bg-rose-600"
                  : stats.level === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-600"
              )}
              style={{ width: `${progressPercent(stats.countedDays, stats.limit)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDays(stats.countedDays)} / {formatDays(stats.limit)} 天
            （待審核 {formatDays(stats.pendingDays)} 天仍暫時計入，批准後會剔除）
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>缺席與請假紀錄</CardTitle>
          <CardDescription>由校務處登記。請核對文件與批准狀態。</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <AbsenceTable
            records={records}
            emptyTitle="沒有缺席紀錄"
            emptyDescription="此學生在本學年尚未有缺席或請假。"
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>警告信存檔</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {letters.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚未發出警告信。</p>
          ) : (
            letters.map((letter) => (
              <Link
                key={letter.id}
                href={`/warnings/${letter.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">發出日期 {formatDate(letter.issuedAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWarningTrigger(letter.type, letter.triggerDays, letter.limitDays)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <WarningTypeBadge type={letter.type} />
                  <WarningStatusBadge status={letter.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
