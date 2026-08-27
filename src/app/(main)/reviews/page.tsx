"use client";

import { useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { AbsenceTable } from "@/components/absence-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { classLabel, filterClassNames, formLabel, listClasses } from "@/lib/rules";
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
  const { currentUser, state, visibleStudents, ready } = useStore();
  const [tab, setTab] = useState<string>("pending");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState("all");
  const [klass, setKlass] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [eclassStatus, setEclassStatus] = useState<EclassStatus | "all">("all");
  const [documentType, setDocumentType] = useState<DocumentType | "all">("all");

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
        if (eclassStatus !== "all" && item.eclassStatus !== eclassStatus) return false;
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
        description="核對缺席原因與醫生紙／家長信。批准後該日不計入出席率及缺席上限。"
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
          <AbsenceTable
            records={byStatus("pending")}
            showStudent
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
    </PageShell>
  );
}
