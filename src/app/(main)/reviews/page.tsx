"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { AbsenceTable } from "@/components/absence-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentMatchesQuery } from "@/lib/student-leave";
import { canApproveAbsenceDocument, classLabel, filterClassNames, formLabel, listClasses, recordHasEarly, recordHasLate } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { DocumentType, EclassStatus, FormLevel, ReviewStatus } from "@/lib/types";

const STATUS_OPTIONS: Array<{ value: EclassStatus | "all"; label: string }> = [
  { value: "all", label: "全部狀態" },
  { value: "absent", label: "缺席" },
  { value: "late", label: "遲到" },
  { value: "leave", label: "事假" },
  { value: "half_absent", label: "半日缺席" },
  { value: "early", label: "早退" },
];

const DOCUMENT_OPTIONS: Array<{ value: DocumentType | "all"; label: string }> = [
  { value: "all", label: "全部文件" },
  { value: "doctor", label: "醫生紙" },
  { value: "parent", label: "家長信" },
  { value: "none", label: "無" },
];

export default function ReviewsPage() {
  const { currentUser, state, visibleStudents, ready, reviewAbsences } = useStore();
  const [tab, setTab] = useState<string>("pending");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState("all");
  const [klass, setKlass] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [eclassStatus, setEclassStatus] = useState<EclassStatus | "all">("all");
  const [documentType, setDocumentType] = useState<DocumentType | "all">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDocument, setBatchDocument] = useState<"keep" | "doctor" | "parent">("keep");
  const [confirmAction, setConfirmAction] = useState<"approved" | "rejected" | null>(null);

  const studentMap = useMemo(() => {
    const map = new Map(visibleStudents.map((item) => [item.id, item]));
    return map;
  }, [visibleStudents]);

  const classes = useMemo(() => {
    const all = listClasses(visibleStudents);
    return filterClassNames(all, form);
  }, [visibleStudents, form]);

  const records = useMemo(() => {
    const allowed = new Set(visibleStudents.map((item) => item.id));
    return state.absences
      .filter((item) => allowed.has(item.studentId))
      .filter((item) => {
        const student = studentMap.get(item.studentId);
        if (!student) return false;
        if (query && !studentMatchesQuery(student, query)) return false;
        if (klass !== "all" && student.className !== klass) return false;
        if (form !== "all" && student.className[0] !== form) return false;
        if (from && item.date < from) return false;
        if (to && item.date > to) return false;
        if (eclassStatus !== "all") {
          const matchesStatus =
            eclassStatus === "late"
              ? recordHasLate(item)
              : eclassStatus === "early"
                ? recordHasEarly(item)
                : item.eclassStatus === eclassStatus;
          if (!matchesStatus) return false;
        }
        if (documentType !== "all" && item.documentType !== documentType) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    state.absences,
    visibleStudents,
    studentMap,
    query,
    klass,
    form,
    from,
    to,
    eclassStatus,
    documentType,
  ]);

  const pendingRecords = useMemo(
    () => records.filter((item) => item.reviewStatus === "pending"),
    [records]
  );
  const selectedRecords = useMemo(
    () => pendingRecords.filter((item) => selectedIds.includes(item.id)),
    [pendingRecords, selectedIds]
  );
  const batchPreview = useMemo(() => {
    if (!confirmAction) return { apply: [] as typeof selectedRecords, skip: [] as typeof selectedRecords };
    if (confirmAction === "rejected" || batchDocument !== "keep") {
      return { apply: selectedRecords, skip: [] as typeof selectedRecords };
    }
    return {
      apply: selectedRecords.filter(canApproveAbsenceDocument),
      skip: selectedRecords.filter((item) => !canApproveAbsenceDocument(item)),
    };
  }, [confirmAction, batchDocument, selectedRecords]);

  useEffect(() => {
    const allowed = new Set(pendingRecords.map((item) => item.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length ? current : next;
    });
  }, [pendingRecords]);

  function openBatch(action: "approved" | "rejected") {
    if (selectedRecords.length === 0) return;
    if (action === "approved" && batchDocument === "keep") {
      const eligible = selectedRecords.filter(canApproveAbsenceDocument);
      if (eligible.length === 0) {
        setConfirmAction("approved");
        return;
      }
    }
    setConfirmAction(action);
  }

  function applyBatch() {
    if (!confirmAction || batchPreview.apply.length === 0) {
      setConfirmAction(null);
      return;
    }
    const result = reviewAbsences(
      selectedRecords.map((item) => item.id),
      {
        reviewStatus: confirmAction,
        documentType:
          confirmAction === "approved" && batchDocument !== "keep" ? batchDocument : undefined,
      }
    );
    if (result.updated > 0) {
      if (confirmAction === "approved" && batchDocument === "keep") {
        setSelectedIds(
          selectedRecords.filter((item) => !canApproveAbsenceDocument(item)).map((item) => item.id)
        );
      } else {
        setSelectedIds([]);
      }
    }
    setConfirmAction(null);
  }

  if (!ready) return <PageSkeleton tiles={3} lines={6} />;

  if (currentUser?.role !== "office") {
    return (
      <PageShell>
        <EmptyState
          icon={Lock}
          title="沒有編輯權限"
          description="文件審核由校務處職員負責。班主任請到學生出勤頁檢閱紀錄。"
        />
      </PageShell>
    );
  }

  const byStatus = (status: ReviewStatus) =>
    records.filter((item) => item.reviewStatus === status);

  return (
    <PageShell>
      <PageHeader
        title="缺席文件審核"
        description="核對缺席原因與醫生紙／家長信。待審核可以勾選多筆一次審批；批准後該日不計入出席率及缺席上限。"
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">篩選</CardTitle>
          <CardDescription>可按日期、學生、班別、狀態及文件類型篩選紀錄。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="review-query">學生</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                id="review-query"
                className="pl-8"
                placeholder="搜尋姓名、英文名或學號"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>年級</Label>
            <Select
              value={form}
              onValueChange={(value) => {
                const nextForm = value ?? "all";
                setForm(nextForm);
                if (nextForm !== "all" && klass !== "all" && klass[0] !== nextForm) {
                  setKlass("all");
                }
              }}
            >
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
            <Label htmlFor="review-from">由</Label>
            <Input
              id="review-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-to">至</Label>
            <Input
              id="review-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>狀態</Label>
            <Select
              value={eclassStatus}
              onValueChange={(value) =>
                setEclassStatus((value as EclassStatus | "all") ?? "all")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>文件</Label>
            <Select
              value={documentType}
              onValueChange={(value) =>
                setDocumentType((value as DocumentType | "all") ?? "all")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(value ?? "pending")} className="gap-6">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 overflow-x-auto border-b border-slate-200 bg-transparent p-0"
        >
          <TabsTrigger
            value="pending"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            待審核
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {byStatus("pending").length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            已批准
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {byStatus("approved").length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-none px-4 py-2.5 text-slate-600 after:bg-slate-900 data-active:text-slate-900"
          >
            未批准
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 tabular-nums">
              {byStatus("rejected").length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {pendingRecords.length > 0 ? (
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-1.5">
                <Label>連續審批</Label>
                <p className="max-w-xl text-xs text-slate-500">
                  勾選多筆後一次完成，不用逐筆打開審核。選擇「沿用各筆紀錄」時，只會批准已提交醫生證明或家長信的紀錄。
                </p>
                <Select
                  value={batchDocument}
                  onValueChange={(value) =>
                    setBatchDocument((value as "keep" | "doctor" | "parent") ?? "keep")
                  }
                >
                <SelectTrigger className="w-full sm:w-64">
                  <span>
                    {batchDocument === "doctor"
                      ? "一律已交醫生證明"
                      : batchDocument === "parent"
                        ? "一律已交家長信"
                        : "沿用各筆紀錄"}
                  </span>
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">沿用各筆紀錄</SelectItem>
                    <SelectItem value="doctor">一律已交醫生證明</SelectItem>
                    <SelectItem value="parent">一律已交家長信</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === pendingRecords.length
                        ? []
                        : pendingRecords.map((item) => item.id)
                    )
                  }
                >
                  {selectedIds.length === pendingRecords.length && pendingRecords.length > 0
                    ? "取消全選"
                    : "全選目前清單"}
                </Button>
                <Button disabled={selectedRecords.length === 0} onClick={() => openBatch("approved")}>
                  一次批准{selectedRecords.length > 0 ? `（${selectedRecords.length}）` : ""}
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedRecords.length === 0}
                  onClick={() => openBatch("rejected")}
                >
                  一次不批准{selectedRecords.length > 0 ? `（${selectedRecords.length}）` : ""}
                </Button>
              </div>
            </div>
          ) : null}
          <AbsenceTable
            records={pendingRecords}
            showStudent
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            emptyTitle="沒有待審核紀錄"
            emptyDescription="所有缺席紀錄均已完成審核。校務處新增的缺席會出現在這裡。"
          />
        </TabsContent>
        <TabsContent value="approved" className="mt-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <AbsenceTable
            records={byStatus("approved")}
            showStudent
            emptyTitle="沒有已批准紀錄"
            emptyDescription="尚未有獲批的缺席或請假文件。"
          />
        </TabsContent>
        <TabsContent value="rejected" className="mt-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <AbsenceTable
            records={byStatus("rejected")}
            showStudent
            emptyTitle="沒有未批准紀錄"
            emptyDescription="尚未有被拒絕的缺席或請假文件。"
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "rejected" ? "確定一次不批准？" : "確定一次批准？"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "rejected"
                ? `將一次不批准 ${selectedRecords.length} 筆。這些紀錄會繼續計入缺席。`
                : batchDocument === "doctor"
                  ? `將把已選 ${selectedRecords.length} 筆標為已提交醫生證明，並一次批准。獲批後不計入出席率及缺席上限。`
                  : batchDocument === "parent"
                    ? `將把已選 ${selectedRecords.length} 筆標為已提交家長信，並一次批准。獲批後不計入出席率及缺席上限。`
                    : batchPreview.apply.length === 0
                      ? "已選紀錄都未提交醫生證明或家長信，不能一次批准。可改選「一律已交醫生證明」或「一律已交家長信」。"
                      : `將一次批准 ${batchPreview.apply.length} 筆。獲批後不計入出席率及缺席上限。${
                          batchPreview.skip.length > 0
                            ? `另有 ${batchPreview.skip.length} 筆未交文件，會略過。`
                            : ""
                        }`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              取消
            </Button>
            <Button
              onClick={applyBatch}
              disabled={confirmAction === null || batchPreview.apply.length === 0}
            >
              {confirmAction === "rejected" ? "確定不批准" : "確定批准"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
