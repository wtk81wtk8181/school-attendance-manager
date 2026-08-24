"use client";

import Link from "next/link";
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
import { formatDate } from "@/lib/format";
import { classLabel, formatDays } from "@/lib/rules";
import { useStore } from "@/lib/store";

export default function WarningsPage() {
  const { state, visibleStudents, currentUser } = useStore();
  const allowed = new Set(visibleStudents.map((item) => item.id));
  const letters = state.warnings
    .filter((item) => allowed.has(item.studentId))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">警告信</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          學生計入缺席達上限一半、超過上限，或缺席＋遲到合計超過 3 次時，平台會自動發出警告信並電郵通知指定收件人。
          {currentUser?.role === "homeroom" ? "班主任可預覽及列印，但不能登記跟進。" : ""}
        </p>
      </div>

      {letters.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title="尚未發出警告信"
          description="當學生計入缺席達到預警線時，系統會在此存檔。"
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>發出日期</TableHead>
                <TableHead>學生</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>當時缺席</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">文件</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {letters.map((letter) => {
                const student = state.students.find((item) => item.id === letter.studentId);
                if (!student) return null;
                return (
                  <TableRow key={letter.id}>
                    <TableCell>{formatDate(letter.issuedAt)}</TableCell>
                    <TableCell>
                      <Link href={`/students/${student.id}`} className="font-medium hover:underline">
                        {classLabel(student.className)} {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <WarningTypeBadge type={letter.type} />
                    </TableCell>
                    <TableCell>
                      {letter.type === "frequent"
                        ? `${formatDays(letter.triggerDays)} 次（缺席＋遲到）`
                        : `${formatDays(letter.triggerDays)} / ${formatDays(letter.limitDays)} 天`}
                    </TableCell>
                    <TableCell>
                      <WarningStatusBadge status={letter.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" render={<Link href={`/warnings/${letter.id}`} />}>
                        預覽／PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
