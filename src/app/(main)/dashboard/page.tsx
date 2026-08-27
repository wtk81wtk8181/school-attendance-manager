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
import { PageHeader, PageShell, PageSkeleton, StatTile } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
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
  const { state, visibleStudents, warningStudents, currentUser, ready } = useStore();

  if (!ready) return <PageSkeleton tiles={4} lines={5} />;

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
    <PageShell>
      <PageHeader
        title="出勤總覽"
        description={
          currentUser?.role === "office"
            ? "全校缺席審核、預警與出席率。獲批請假不計入缺席上限。"
            : `正在檢閱 ${currentUser?.title} 負責班級，僅供查閱。`
        }
      />

      {currentUser?.role === "office" ? (
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-orange-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600" />
              教育局 Form A 申報提醒
            </CardTitle>
            <CardDescription>
              連續七個上課日缺席（不計算星期六、日）須向教育局申報 Form A。達標學生會從班別名單隱藏。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {formAStudents.length === 0 ? (
              <p className="text-slate-400">目前沒有學生達到連續七個上課日缺席。</p>
            ) : (
              formAStudents.map((item) => (
                <p key={item.studentId} className="text-slate-900">
                  {classLabel(item.className)}　{item.studentName}同學已連續 {item.streak} 個上課日缺席
                  {item.lastAbsentDate ? `（至 ${item.lastAbsentDate}）` : ""}
                </p>
              ))
            )}
            <Button size="sm" variant="outline" render={<Link href="/students" />}>
              前往學生出勤跟進
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="監察學生"
          value={stats.length}
          hint={`${state.academicYear.label} 學年・${state.academicYear.schoolDays} 個上課日`}
          icon={Users}
          tone="blue"
        />
        <StatTile
          label="平均出席率"
          value={formatPercent(avgRate)}
          hint="（上課日 − 計入缺席）÷ 上課日"
          icon={Percent}
          tone="emerald"
        />
        <StatTile
          label="預警學生"
          value={warningCount}
          hint="已達上限一半，尚未超過上限"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatTile
          label="超過上限"
          value={overCount}
          hint="中一至中五 9 天；中六 4.5 天"
          icon={FileWarning}
          tone="rose"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>待追收文件</CardTitle>
              <CardDescription>
                {documentChase.length === 0
                  ? "目前沒有需要追收的缺席文件"
                  : `${chaseStudentCount} 名學生・${documentChase.length} 個缺席日`}
              </CardDescription>
            </div>
            <FileText className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            {documentChase.length === 0 ? (
              <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
                <CheckCircle2 className="size-4" />
                現時沒有需要追收的醫生紙或家長信。
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {documentChase.slice(0, 8).map((item) => {
                  const student = state.students.find((row) => row.id === item.studentId);
                  if (!student) return null;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/students/${student.id}`}
                        className="flex flex-col gap-1 px-3 py-2.5 transition-colors duration-200 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="font-medium text-slate-900">
                          {classLabel(student.className)}　{student.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          <span className="font-medium text-slate-900">{formatDate(item.date)}</span>
                          <span className="text-slate-400">　需追收{documentNeededLabel(item)}</span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>待辦</CardTitle>
            <CardDescription>
              {currentUser?.role === "office"
                ? "校務處跟進事項"
                : "本班警告信可在此查看"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {currentUser?.role === "office" ? (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 transition-colors duration-200 hover:bg-blue-50">
                  <ClipboardList className="mt-0.5 size-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">待審核缺席 {pending.length} 筆</p>
                    <p className="text-xs text-slate-400">核對醫生證明、家長信與缺席原因</p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href="/reviews" />}>
                    審核
                  </Button>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3 transition-colors duration-200 hover:bg-violet-50">
                  <CalendarClock className="mt-0.5 size-4 text-violet-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">預先請假</p>
                    <p className="text-xs text-slate-400">到日自動顯示於缺席報告</p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href="/pre-leave" />}>
                    登記
                  </Button>
                </div>
              </>
            ) : null}
            <div className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50/50 p-3 transition-colors duration-200 hover:bg-rose-50">
              <FileWarning className="mt-0.5 size-4 text-rose-600" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">待跟進警告信 {openLetters.length} 封</p>
                <p className="text-xs text-slate-400">缺席與遲到分開發出</p>
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
                      <span className="text-slate-600">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>需跟進學生</CardTitle>
            <CardDescription>按計入缺席日數由高至低排列</CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/students" />}>
            全部學生
          </Button>
        </CardHeader>
        <CardContent>
          {watchList.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="目前沒有學生觸及預警線"
              description="當學生達缺席預警或超過上限時，會顯示於此。"
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <div className="space-y-2">
              {watchList.map((item) => (
                <Link
                  key={item.student.id}
                  href={`/students/${item.student.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition-colors duration-200 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {classLabel(item.student.className)}　{item.student.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      計入缺席 {formatDays(item.countedDays)} / {formatDays(item.limit)} 天・出席率{" "}
                      {formatPercent(item.attendanceRate)}
                    </p>
                  </div>
                  <LevelBadge level={item.level} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
