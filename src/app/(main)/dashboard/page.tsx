"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileWarning,
  Percent,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LevelBadge, ReviewBadge } from "@/components/status-badges";
import {
  buildStudentStats,
  classLabel,
  documentNeededLabel,
  formatDays,
  needsDocumentChase,
} from "@/lib/rules";
import { formatDate, formatPercent, formatShortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { formACases } from "@/lib/hidden-students";

export default function DashboardPage() {
  const { state, visibleStudents, warningStudents, currentUser } = useStore();
  const stats = visibleStudents.map((student) =>
    buildStudentStats(student, state.absences, state.academicYear.schoolDays)
  );
  const warningCount = stats.filter((item) => item.level === "warning").length;
  const overCount = stats.filter((item) => item.level === "over").length;
  const pending = state.absences.filter(
    (item) =>
      item.reviewStatus === "pending" &&
      visibleStudents.some((student) => student.id === item.studentId)
  );
  const documentChase = state.absences
    .filter(
      (item) =>
        needsDocumentChase(item) &&
        visibleStudents.some((student) => student.id === item.studentId)
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const chaseStudentCount = new Set(documentChase.map((item) => item.studentId)).size;
  const avgRate =
    stats.length === 0
      ? 100
      : stats.reduce((sum, item) => sum + item.attendanceRate, 0) / stats.length;
  const openLetters = state.warnings.filter(
    (item) =>
      item.status === "issued" &&
      warningStudents.some((student) => student.id === item.studentId)
  );
  const watchList = [...stats]
    .filter((item) => item.level !== "ok")
    .sort((a, b) => b.countedDays - a.countedDays);
  const formAStudents = formACases(
    state.students,
    state.absences,
    state.hiddenStudents,
    state.hiddenStudentRemovals
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {currentUser?.role === "office" ? (
        <Card className="border-rose-300 bg-rose-50 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-rose-950">
              <AlertTriangle className="size-4" />
              教育局 Form A 申報提醒
            </CardTitle>
            <CardDescription className="text-rose-900/80">
              連續七個上課日缺席（不計算星期六、日）須向教育局申報 Form A。達標學生會從班別名單隱藏，每日缺席報告的「學生總人數」亦會扣減。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-rose-950">
            {formAStudents.length === 0 ? (
              <p>目前沒有學生達到連續七個上課日缺席。</p>
            ) : (
              formAStudents.map((item) => (
                <p key={item.studentId}>
                  {classLabel(item.className)}　{item.studentName}同學已連續 {item.streak} 個上課日缺席
                  {item.lastAbsentDate ? `（至 ${item.lastAbsentDate}）` : ""}
                </p>
              ))
            )}
            <div className="pt-1">
              <Button size="sm" variant="outline" render={<Link href="/students" />}>
                前往學生出勤跟進
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">出勤總覽</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentUser?.role === "office"
            ? "全校缺席審核、預警與出席率。獲批請假不計入缺席上限。"
            : `正在檢閱 ${currentUser?.title} 負責班級，僅供查閱。`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none sm:col-span-2 xl:col-span-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">待追收醫生紙／家長信</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight">
                      {chaseStudentCount} 名學生
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {documentChase.length === 0
                      ? "目前沒有需要追收的缺席文件"
                      : `共 ${documentChase.length} 個缺席日尚未交齊文件`}
                  </p>
                </div>
                {documentChase.length === 0 ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    現時沒有需要追收的醫生紙或家長信。
                  </p>
                ) : (
                  <ul className="mt-3 divide-y rounded-lg border bg-white">
                    {documentChase.slice(0, 8).map((item) => {
                      const student = state.students.find((row) => row.id === item.studentId);
                      if (!student) return null;
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/students/${student.id}`}
                            className="flex flex-col gap-1 px-3 py-2.5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <p className="font-medium">
                              {classLabel(student.className)}　{student.name}
                            </p>
                            <p className="text-sm text-[var(--school-navy)]">
                              <span className="font-semibold">{formatDate(item.date)}</span>
                              <span className="text-muted-foreground">
                                　需追收{documentNeededLabel(item)}
                              </span>
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {documentChase.length > 8 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    還有 {documentChase.length - 8} 個缺席日，可到學生出勤頁查看全部。
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard
          label="監察學生"
          value={String(stats.length)}
          hint={`${state.academicYear.label} 學年・${state.academicYear.schoolDays} 個上課日`}
          icon={Users}
        />
        <StatCard
          label="平均出席率"
          value={formatPercent(avgRate)}
          hint="公式：（上課日 − 計入缺席）÷ 上課日"
          icon={Percent}
          tone="success"
        />
        <StatCard
          label="預警學生"
          value={String(warningCount)}
          hint="已達上限一半，尚未超過上限"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="超過上限"
          value={String(overCount)}
          hint="中一至中五 9 天；中六 4.5 天"
          icon={FileWarning}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>需跟進學生</CardTitle>
              <CardDescription>按計入缺席日數由高至低排列</CardDescription>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/students" />}>
              全部學生
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchList.length === 0 ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" />
                目前沒有學生觸及預警線。
              </p>
            ) : (
              watchList.map((item) => (
                <Link
                  key={item.student.id}
                  href={`/students/${item.student.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">
                      {classLabel(item.student.className)}　{item.student.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      計入缺席 {formatDays(item.countedDays)} / {formatDays(item.limit)} 天・出席率{" "}
                      {formatPercent(item.attendanceRate)}
                    </p>
                  </div>
                  <LevelBadge level={item.level} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>待辦</CardTitle>
            <CardDescription>
              {currentUser?.role === "office"
                ? "校務處跟進事項會通知職員"
                : "本班警告信可在此查看，文件審核與預先請假由校務處處理"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {currentUser?.role === "office" ? (
              <>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <ClipboardList className="mt-0.5 size-4 text-[var(--school-navy)]" />
                  <div className="flex-1">
                    <p className="font-medium">待審核缺席 {pending.length} 筆</p>
                    <p className="text-xs text-muted-foreground">核對醫生證明、家長信與缺席原因</p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href="/reviews" />}>
                    審核
                  </Button>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <CalendarClock className="mt-0.5 size-4 text-[var(--school-navy)]" />
                  <div className="flex-1">
                    <p className="font-medium">預先請假</p>
                    <p className="text-xs text-muted-foreground">
                      學生及教職員可提早登記請假，到日自動顯示於缺席報告
                    </p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href="/pre-leave" />}>
                    登記
                  </Button>
                </div>
              </>
            ) : null}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <FileWarning className="mt-0.5 size-4 text-amber-700" />
              <div className="flex-1">
                <p className="font-medium">待跟進警告信 {openLetters.length} 封</p>
                <p className="text-xs text-muted-foreground">達上限一半或超過上限時自動發出</p>
              </div>
              <Button size="sm" variant="outline" render={<Link href="/warnings" />}>
                查看
              </Button>
            </div>
            {currentUser?.role === "office"
              ? pending.slice(0, 4).map((item) => {
                  const student = state.students.find((row) => row.id === item.studentId);
                  if (!student) return null;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {formatShortDate(item.date)}　{student.name}　{item.reason}
                      </span>
                      <ReviewBadge status={item.reviewStatus} />
                    </div>
                  );
                })
              : null}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            出席率與缺席上限（備註）
          </CardTitle>
          <CardDescription className="text-[11px] leading-5">
            校務處於本平台登記或審核缺席。獲批請假（醫生紙／家長信）不計入出席率，也不計入缺席上限。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 px-4 pb-4 text-[11px] leading-5 text-muted-foreground md:grid-cols-2">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="font-medium text-foreground/70">出席率</p>
            <p>出席率 =（總上課日數 − 計入缺席日數）÷ 總上課日數 × 100%</p>
            <p>計入缺席日數 = 無故缺席 + 未批准請假</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="font-medium text-foreground/70">缺席上限</p>
            <p>缺席達預警線、超過上限或缺席逾 3 次會發出缺席警告信；遲到逾 3 次會另發遲到警告信。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
