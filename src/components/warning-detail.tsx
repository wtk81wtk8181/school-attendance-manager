"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileWarning, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { WarningLetterBundle } from "@/components/warning-letter";
import { WarningStatusBadge, WarningTypeBadge } from "@/components/status-badges";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export function WarningDetail({ id }: { id: string }) {
  const { state, warningStudents, currentUser } = useStore();
  const letter = state.warnings.find((item) => item.id === id);
  const student = letter
    ? warningStudents.find((item) => item.id === letter.studentId) ??
      state.students.find((item) => item.id === letter.studentId)
    : undefined;
  const reviewer = letter?.followedUpBy
    ? state.users.find((user) => user.id === letter.followedUpBy)
    : undefined;

  if (!letter || !student) {
    return (
      <EmptyState
        icon={FileWarning}
        title="找不到這封警告信"
        description="文件不存在，或你沒有權限檢視該學生的信件。"
      />
    );
  }

  const canEdit = currentUser?.role === "office";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 sm:px-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-slate-600 transition-colors duration-200 hover:text-slate-900"
            render={<Link href="/warnings" />}
          >
            <ArrowLeft className="size-3.5" />
            返回存檔
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            警告信預覽（中英對照）
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <WarningTypeBadge type={letter.type} />
            <WarningStatusBadge status={letter.status} />
          </div>
        </div>
        <Button
          className="transition-colors duration-200"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          下載／列印 PDF（中英）
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100/60 p-4 transition-colors duration-200 print:border-0 print:bg-white print:p-0">
        <WarningLetterBundle student={student} letter={letter} />
      </div>

      <Card className="no-print shadow-none ring-slate-200/80 transition-all duration-200 hover:ring-slate-300/80">
        <CardHeader>
          <CardTitle className="text-slate-900">校務處跟進</CardTitle>
          <CardDescription className="text-slate-600">
            警告信發出後，職員須聯絡家長或班主任，並在此登記處理情況。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {letter.followedUpAt ? (
            <p className="text-sm text-slate-600">
              上次跟進：{reviewer?.name ?? "校務處"}　{formatDateTime(letter.followedUpAt)}
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">尚未登記跟進。</span>
            </p>
          )}
          {canEdit ? (
            <FollowUpEditor
              key={`${letter.id}-${letter.followedUpAt ?? "new"}`}
              letterId={letter.id}
              initialNotes={letter.followUpNotes ?? ""}
              initialArchive={letter.status === "archived"}
            />
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200/80">
              {letter.followUpNotes || "班主任帳號僅可預覽信件，跟進由校務處登記。"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FollowUpEditor({
  letterId,
  initialNotes,
  initialArchive,
}: {
  letterId: string;
  initialNotes: string;
  initialArchive: boolean;
}) {
  const { followUpWarning } = useStore();
  const [notes, setNotes] = useState(initialNotes);
  const [archive, setArchive] = useState(initialArchive);

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="follow-up">跟進紀錄</Label>
        <Textarea
          id="follow-up"
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="例如：已致電家長、約見班主任、補交醫生證明中……"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={archive}
          onCheckedChange={(checked) => setArchive(checked === true)}
        />
        處理完成，將信件存檔
      </label>
      <Button onClick={() => followUpWarning(letterId, { notes, archive })}>
        儲存跟進
      </Button>
    </>
  );
}
