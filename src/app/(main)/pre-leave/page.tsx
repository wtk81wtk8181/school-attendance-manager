"use client";

import { useState } from "react";
import { CalendarDays, Lock } from "lucide-react";
import { DailyStaffSection } from "@/components/daily-staff-section";
import { StudentLeaveSection } from "@/components/student-leave-section";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hongKongToday } from "@/lib/digest";
import { formatShortDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function PreLeavePage() {
  const { currentUser } = useStore();
  const [date, setDate] = useState(hongKongToday());

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="沒有編輯權限"
        description="預先請假由校務處負責登記。老師請到總覽查看當日資料。"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">預先請假</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          學生及教職員均可提早登記請假；到請假當日會自動顯示於總覽、每日缺席報告及電郵。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4" />
            選擇參考日期
          </CardTitle>
          <CardDescription>
            用於預覽當日已登記的請假。登記時可另選開始／結束日期。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid max-w-xs flex-1 gap-1.5">
            <Label htmlFor="pre-leave-date">日期</Label>
            <Input
              id="pre-leave-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">目前預覽：{formatShortDate(date)}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">學生</TabsTrigger>
          <TabsTrigger value="staff">教職員</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
          <div className="rounded-xl border bg-white p-4">
            <StudentLeaveSection date={date} />
          </div>
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <div className="rounded-xl border bg-white p-4">
            <DailyStaffSection date={date} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
