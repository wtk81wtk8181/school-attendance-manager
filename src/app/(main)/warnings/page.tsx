"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  FileWarning,
  Mail,
  UserX,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { WarningStatusBadge, WarningTypeBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isStudentHidden } from "@/lib/hidden-students";
import { formatDate } from "@/lib/format";
import {
  classLabel,
  formatWarningTrigger,
  warningCategory,
  type WarningCategory,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { Student, WarningLetter } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | WarningCategory;

const EMPTY_COPY: Record<
  CategoryFilter,
  { title: string; description: string }
> = {
  all: {
    title: "尚未有警告信",
    description: "當學生觸及缺席或遲到預警線時，系統會自動發出並存檔於此。",
  },
  absence: {
    title: "尚未有缺席警告信",
    description: "缺席達預警線、超過上限或缺席逾 3 次時，系統會自動發出信件。",
  },
  late: {
    title: "尚未有遲到警告信",
    description: "學生遲到逾 3 次時，系統會另發遲到警告信。",
  },
};

function filterByCategory<T extends { type: WarningLetter["type"] }>(
  items: T[],
  category: CategoryFilter
): T[] {
  if (category === "all") return items;
  return items.filter((item) => warningCategory(item.type) === category);
}

function WarningsPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 sm:px-0">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="shadow-none ring-slate-200/80">
            <CardContent className="flex items-start gap-3 p-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 border-b border-slate-200 pb-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-24" />
          ))}
        </div>
        <div className="hidden space-y-3 md:block">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p>
      </div>
    </>
  );

  const className = cn(
    "group w-full text-left shadow-none ring-slate-200/80 transition-all duration-200 hover:ring-slate-300/80",
    active && "ring-slate-900/20 bg-slate-50/80"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-xl text-left">
        <Card className={className}>
          <CardContent className="flex items-start gap-3 p-4">{content}</CardContent>
        </Card>
      </button>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-4">{content}</CardContent>
    </Card>
  );
}

function WarningLetterCard({
  letter,
  student,
  hidden,
}: {
  letter: WarningLetter;
  student: Student;
  hidden: boolean;
}) {
  return (
    <Card className="shadow-none ring-slate-200/80 transition-all duration-200 hover:bg-slate-50/60 hover:ring-slate-300/80 md:hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">
              {classLabel(student.className)} {student.name}
            </p>
            {hidden ? (
              <p className="mt-0.5 text-xs text-slate-400">已隱藏</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">{formatDate(letter.issuedAt)}</p>
          </div>
          <WarningStatusBadge status={letter.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WarningTypeBadge type={letter.type} />
          <span className="text-xs text-slate-600">
            {formatWarningTrigger(letter.type, letter.triggerDays, letter.limitDays)}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full border-slate-200 text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
          render={<Link href={`/warnings/${letter.id}`} />}
        >
          預覽／PDF（中英）
          <ArrowRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function WarningLetterTable({
  letters,
  students,
  hiddenStudents,
  hiddenStudentRemovals,
}: {
  letters: WarningLetter[];
  students: Student[];
  hiddenStudents: ReturnType<typeof useStore>["state"]["hiddenStudents"];
  hiddenStudentRemovals: ReturnType<typeof useStore>["state"]["hiddenStudentRemovals"];
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="text-slate-600">發出日期</TableHead>
            <TableHead className="text-slate-600">學生</TableHead>
            <TableHead className="text-slate-600">類型</TableHead>
            <TableHead className="text-slate-600">觸發數值</TableHead>
            <TableHead className="text-slate-600">狀態</TableHead>
            <TableHead className="text-right text-slate-600">文件</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {letters.map((letter) => {
            const student = students.find((item) => item.id === letter.studentId);
            if (!student) return null;
            const hidden = isStudentHidden(
              hiddenStudents,
              hiddenStudentRemovals,
              student.id
            );
            return (
              <TableRow
                key={letter.id}
                className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
              >
                <TableCell className="text-slate-600">{formatDate(letter.issuedAt)}</TableCell>
                <TableCell>
                  <span className="font-medium text-slate-900">
                    {classLabel(student.className)} {student.name}
                  </span>
                  {hidden ? (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      （已隱藏）
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <WarningTypeBadge type={letter.type} />
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatWarningTrigger(
                    letter.type,
                    letter.triggerDays,
                    letter.limitDays
                  )}
                </TableCell>
                <TableCell>
                  <WarningStatusBadge status={letter.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    render={<Link href={`/warnings/${letter.id}`} />}
                  >
                    預覽／PDF（中英）
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function WarningsPage() {
  const { state, warningStudents, currentUser, ready } = useStore();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const allowed = new Set(warningStudents.map((item) => item.id));

  const letters = useMemo(
    () =>
      state.warnings
        .filter((item) => allowed.has(item.studentId))
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [allowed, state.warnings]
  );

  const counts = useMemo(
    () => ({
      all: letters.length,
      absence: letters.filter((item) => warningCategory(item.type) === "absence")
        .length,
      late: letters.filter((item) => warningCategory(item.type) === "late").length,
      pending: letters.filter((item) => item.status === "issued").length,
    }),
    [letters]
  );

  if (!ready) {
    return <WarningsPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 sm:px-0">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">警告信</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          缺席與遲到分開發出獨立警告信。缺席類包括達預警線、超過上限及缺席逾 3 次；遲到類為遲到逾 3 次。
          {currentUser?.role === "homeroom" ? (
            <span className="text-slate-400">
              {" "}
              班主任可預覽及列印，但不能登記跟進。
            </span>
          ) : null}
        </p>
      </header>

      <section
        aria-label="警告信統計"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatTile
          label="全部"
          value={counts.all}
          hint="存檔中的警告信總數"
          icon={Mail}
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        <StatTile
          label="缺席類"
          value={counts.absence}
          hint="預警、超上限及缺席逾 3 次"
          icon={UserX}
          active={category === "absence"}
          onClick={() => setCategory("absence")}
        />
        <StatTile
          label="遲到類"
          value={counts.late}
          hint="遲到逾 3 次"
          icon={Clock}
          active={category === "late"}
          onClick={() => setCategory("late")}
        />
        <StatTile
          label="待跟進"
          value={counts.pending}
          hint="尚未登記校務處跟進"
          icon={FileWarning}
        />
      </section>

      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as CategoryFilter)}
        className="gap-6"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 overflow-x-auto border-b border-slate-200 bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsTrigger
            value="all"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            全部
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {counts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="absence"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            缺席
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {counts.absence}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="late"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            遲到
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {counts.late}
            </span>
          </TabsTrigger>
        </TabsList>

        {(["all", "absence", "late"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 outline-none">
            {filterByCategory(letters, tab).length === 0 ? (
              <EmptyState
                icon={FileWarning}
                title={EMPTY_COPY[tab].title}
                description={EMPTY_COPY[tab].description}
              />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filterByCategory(letters, tab).map((letter) => {
                    const student = state.students.find(
                      (item) => item.id === letter.studentId
                    );
                    if (!student) return null;
                    const hidden = isStudentHidden(
                      state.hiddenStudents,
                      state.hiddenStudentRemovals,
                      student.id
                    );
                    return (
                      <WarningLetterCard
                        key={letter.id}
                        letter={letter}
                        student={student}
                        hidden={hidden}
                      />
                    );
                  })}
                </div>
                <WarningLetterTable
                  letters={filterByCategory(letters, tab)}
                  students={state.students}
                  hiddenStudents={state.hiddenStudents}
                  hiddenStudentRemovals={state.hiddenStudentRemovals}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
