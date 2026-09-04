"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AbsenceDetailFields } from "@/components/absence-detail-fields";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { AbsenceRecord, ContactMethod, DocumentType, ReviewStatus, Student } from "@/lib/types";
import { classLabel } from "@/lib/rules";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export function ReviewDialog({
  open,
  onOpenChange,
  record,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AbsenceRecord | null;
  student: Student | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {record && student ? (
        <ReviewForm
          key={record.id}
          record={record}
          student={student}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}

function ReviewForm({
  record,
  student,
  onOpenChange,
}: {
  record: AbsenceRecord;
  student: Student;
  onOpenChange: (open: boolean) => void;
}) {
  const { reviewAbsence } = useStore();
  const [documentType, setDocumentType] = useState<DocumentType>(record.documentType);
  const [documentSubmitted, setDocumentSubmitted] = useState(record.documentSubmitted);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(record.reviewStatus);
  const [days, setDays] = useState<"0.5" | "1">(record.days === 0.5 ? "0.5" : "1");
  const [reason, setReason] = useState(record.reason);
  const [calledBy, setCalledBy] = useState(record.calledBy ?? "");
  const [calledAt, setCalledAt] = useState(record.calledAt ?? "");
  const [contactMethod, setContactMethod] = useState(record.contactMethod);
  const [contactedOn, setContactedOn] = useState(record.contactedOn ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");

  const canApprove =
    documentSubmitted && (documentType === "doctor" || documentType === "parent");

  function submit() {
    if (reviewStatus === "approved" && !canApprove) return;
    reviewAbsence(record.id, {
      documentType,
      documentSubmitted,
      reviewStatus,
      days: days === "0.5" ? 0.5 : 1,
      reason,
      notes,
      calledBy,
      calledAt,
      contactMethod,
      contactedOn,
    });
    onOpenChange(false);
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>審核缺席紀錄</DialogTitle>
        <DialogDescription>
          {classLabel(student.className)} {student.name}　{formatDate(record.date)}
          。獲批請假不計入缺席上限，亦不影響出席率。
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <div className="grid grid-cols-3 gap-3 text-sm font-medium">
            <span>請假／缺席原因</span>
            <span>致電人士／聯絡方式</span>
            <span>申請／致電時間</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AbsenceDetailFields
              reason={reason}
              calledBy={calledBy}
              calledAt={calledAt}
              contactMethod={contactMethod}
              contactedOn={contactedOn}
              recordDate={record.date}
              onChange={(next) => {
                setReason(next.reason);
                setCalledBy(next.calledBy);
                setCalledAt(next.calledAt);
                setContactMethod(next.contactMethod);
                setContactedOn(next.contactedOn);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>日數</Label>
            <Select value={days} onValueChange={(value) => setDays(value as "0.5" | "1")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">全日（1 天）</SelectItem>
                <SelectItem value="0.5">半日（0.5 天）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>文件類型</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">醫生證明</SelectItem>
                <SelectItem value="parent">家長信</SelectItem>
                <SelectItem value="none">無文件</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={documentSubmitted}
            onCheckedChange={(checked) => setDocumentSubmitted(checked === true)}
          />
          已提交實體／掃描文件
        </label>

        <div className="grid gap-1.5">
          <Label>審核結果</Label>
          <Select
            value={reviewStatus}
            onValueChange={(value) => setReviewStatus(value as ReviewStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待審核</SelectItem>
              <SelectItem value="approved">批准（不計入出席率及缺席上限）</SelectItem>
              <SelectItem value="rejected">不批准（計入缺席）</SelectItem>
            </SelectContent>
          </Select>
          {reviewStatus === "approved" && !canApprove ? (
            <p className="text-xs text-rose-700">
              批准前必須已提交醫生證明或家長信。
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">校務處備註</Label>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="例如：醫生紙日期已核對、家長信退回補交……"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button onClick={submit} disabled={reviewStatus === "approved" && !canApprove}>
          儲存審核
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
