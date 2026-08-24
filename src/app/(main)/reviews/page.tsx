"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AbsenceTable } from "@/components/absence-table";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import type { ReviewStatus } from "@/lib/types";

export default function ReviewsPage() {
  const { currentUser, state, visibleStudents } = useStore();
  const [tab, setTab] = useState<string>("pending");

  const records = useMemo(() => {
    const allowed = new Set(visibleStudents.map((item) => item.id));
    return state.absences
      .filter((item) => allowed.has(item.studentId))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.absences, visibleStudents]);

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="沒有編輯權限"
        description="文件審核由校務處職員負責。班主任請到學生出勤頁檢閱紀錄。"
      />
    );
  }

  const byStatus = (status: ReviewStatus) =>
    records.filter((item) => item.reviewStatus === status);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">缺席文件審核</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          核對 eClass 同步的缺席原因與文件。批准後該日不計入出席率及缺席上限。
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value ?? "pending")}>
        <TabsList>
          <TabsTrigger value="pending">待審核（{byStatus("pending").length}）</TabsTrigger>
          <TabsTrigger value="approved">已批准（{byStatus("approved").length}）</TabsTrigger>
          <TabsTrigger value="rejected">未批准（{byStatus("rejected").length}）</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 rounded-xl border bg-white">
          <AbsenceTable
            records={byStatus("pending")}
            showStudent
            emptyTitle="沒有待審核紀錄"
            emptyDescription="所有同步缺席均已完成審核。新的 eClass 點名匯入後會出現在這裡。"
          />
        </TabsContent>
        <TabsContent value="approved" className="mt-4 rounded-xl border bg-white">
          <AbsenceTable records={byStatus("approved")} showStudent />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4 rounded-xl border bg-white">
          <AbsenceTable records={byStatus("rejected")} showStudent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
