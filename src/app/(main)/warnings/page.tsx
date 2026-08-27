"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileWarning } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { WarningStatusBadge, WarningTypeBadge } from "@/components/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isStudentHidden } from "@/lib/hidden-students";
import { formatDate } from "@/lib/format";
import { classLabel, formatWarningTrigger, warningCategory, type WarningCategory } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { WarningLetter } from "@/lib/types";

type CategoryFilter = "all" | WarningCategory;

function filterByCategory<T extends { type: WarningLetter["type"] }>(
  items: T[],
  category: CategoryFilter
): T[] {
  if (category === "all") return items;
  return items.filter((item) => warningCategory(item.type) === category);
}

export default function WarningsPage() {
  const { state, warningStudents, currentUser } = useStore();
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
      absence: letters.filter((item) => warningCategory(item.type) === "absence").length,
      late: letters.filter((item) => warningCategory(item.type) === "late").length,
    }),
    [letters]
  );

  const filtered = filterByCategory(letters, category);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">警告信</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          缺席與遲到分開發出獨立警告信。缺席類包括達預警線、超過上限及缺席逾 3 次；遲到類為遲到逾 3 次。
          {currentUser?.role === "homeroom" ? "班主任可預覽及列印，但不能登記跟進。" : ""}
        </p>
      </div>

      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as CategoryFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">全部（{counts.all}）</TabsTrigger>
          <TabsTrigger value="absence">缺席（{counts.absence}）</TabsTrigger>
          <TabsTrigger value="late">遲到（{counts.late}）</TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileWarning}
              title="此類別尚未有警告信"
              description="當學生觸及相應預警線時，系統會自動發出並存檔於此。"
            />
          ) : (
            <div className="rounded-xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>發出日期</TableHead>
                    <TableHead>學生</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>觸發數值</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">文件</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((letter) => {
                    const student = state.students.find((item) => item.id === letter.studentId);
                    if (!student) return null;
                    const hidden = isStudentHidden(
                      state.hiddenStudents,
                      state.hiddenStudentRemovals,
                      student.id
                    );
                    return (
                      <TableRow key={letter.id}>
                        <TableCell>{formatDate(letter.issuedAt)}</TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {classLabel(student.className)} {student.name}
                            {hidden ? (
                              <span className="ml-1.5 text-xs font-normal text-amber-800">
                                （已隱藏）
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell>
                          <WarningTypeBadge type={letter.type} />
                        </TableCell>
                        <TableCell>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
