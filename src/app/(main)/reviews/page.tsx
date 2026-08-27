"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AbsenceTable } from "@/components/absence-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import type { ReviewStatus } from "@/lib/types";

export default function ReviewsPage() {
  const { currentUser, state, visibleStudents, ready } = useStore();
  const [tab, setTab] = useState<string>("pending");

  const records = useMemo(() => {
    const allowed = new Set(visibleStudents.map((item) => item.id));
    return state.absences
      .filter((item) => allowed.has(item.studentId))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.absences, visibleStudents]);

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
