"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentBadge, ReviewBadge } from "@/components/status-badges";
import { ReviewDialog } from "@/components/review-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAbsenceRecordLine } from "@/lib/attendance-extras";
import { formatShortDate } from "@/lib/format";
import {
  attendanceStatusLabel,
  classLabel,
  formatDays,
  isCountedTowardAbsence,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { AbsenceRecord, Student } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList, ArrowDown, ArrowUp } from "lucide-react";

export function AbsenceTable({
  records,
  showStudent = false,
  emptyTitle = "沒有缺席紀錄",
  emptyDescription = "所選範圍內沒有缺席或請假資料。",
}: {
  records: AbsenceRecord[];
  showStudent?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { state, currentUser } = useStore();
  const [editing, setEditing] = useState<AbsenceRecord | null>(null);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  const canEdit = currentUser?.role === "office";

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of state.students) map.set(student.id, student);
    return map;
  }, [state.students]);

  const sortedRecords = useMemo(() => {
    const copy = [...records];
    copy.sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return dateSort === "desc" ? -byDate : byDate;
      return a.studentId.localeCompare(b.studentId);
    });
    return copy;
  }, [records, dateSort]);

  if (records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={emptyTitle}
        description={emptyDescription}
        className="border-0 bg-transparent py-10"
      />
    );
  }

  const editingStudent = editing ? studentMap.get(editing.studentId) ?? null : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                onClick={() =>
                  setDateSort((current) => (current === "desc" ? "asc" : "desc"))
                }
                title={
                  dateSort === "desc"
                    ? "由近至遠（按一下改為由遠至近）"
                    : "由遠至近（按一下改為由近至遠）"
                }
              >
                日期
                {dateSort === "desc" ? (
                  <ArrowDown className="size-3.5" aria-hidden />
                ) : (
                  <ArrowUp className="size-3.5" aria-hidden />
                )}
              </button>
            </TableHead>
            {showStudent ? <TableHead>學生</TableHead> : null}
            <TableHead>狀態</TableHead>
            <TableHead>日數</TableHead>
            <TableHead>原因</TableHead>
            <TableHead>致電人士</TableHead>
            <TableHead>致電時間</TableHead>
            <TableHead>文件</TableHead>
            <TableHead>審核</TableHead>
            <TableHead>計入缺席</TableHead>
            {canEdit ? <TableHead className="text-right">操作</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecords.map((record) => {
            const student = studentMap.get(record.studentId);
            const counted = isCountedTowardAbsence(record);
            return (
              <TableRow key={record.id}>
                <TableCell className="whitespace-nowrap">
                  {formatShortDate(record.date)}
                </TableCell>
                {showStudent ? (
                  <TableCell>
                    {student ? (
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium hover:underline"
                      >
                        {classLabel(student.className)} {student.name}
                      </Link>
                    ) : (
                      record.studentId
                    )}
                  </TableCell>
                ) : null}
                <TableCell>{attendanceStatusLabel(record.eclassStatus)}</TableCell>
                <TableCell>{formatDays(record.days)}</TableCell>
                <TableCell className="max-w-[280px] whitespace-normal">
                  {formatAbsenceRecordLine(student?.name ?? "", record)}
                </TableCell>
                <TableCell>{record.calledBy ?? "尚未致電"}</TableCell>
                <TableCell>{record.calledAt ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <DocumentBadge type={record.documentType} />
                    <span className="text-[11px] text-slate-400">
                      {record.documentSubmitted ? "已提交" : "未提交"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ReviewBadge status={record.reviewStatus} />
                </TableCell>
                <TableCell className={counted ? "text-rose-700" : "text-emerald-700"}>
                  {counted ? "是" : "否"}
                </TableCell>
                {canEdit ? (
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(record)}>
                      審核
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ReviewDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        record={editing}
        student={editingStudent}
      />
    </>
  );
}
