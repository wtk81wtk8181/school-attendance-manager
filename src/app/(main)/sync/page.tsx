"use client";

import { Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function SyncPage() {
  const { currentUser, state, simulateSync, resetDemo } = useStore();

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="老師無需操作此平台"
        description="日常點名在 eClass 完成。班主任請檢閱本班出勤；同步與審核由校務處負責。"
      />
    );
  }

  const latest = state.syncLogs[0];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">eClass 數據整合</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          老師在 eClass 標記出席、缺席或請假後，紀錄會自動匯入本平台，供校務處核對文件。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>同步狀態</CardTitle>
          <CardDescription>
            {latest
              ? `最近一次同步：${formatDateTime(latest.syncedAt)}（上課日 ${formatDate(latest.schoolDay)}）`
              : "尚未同步"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={simulateSync}>
            <RefreshCw className="size-4" />
            模擬同步補課日點名
          </Button>
          <Button variant="outline" onClick={resetDemo}>
            還原示範數據
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>工作流程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7">
          <ol className="list-decimal space-y-2 pl-5">
            <li>老師於 eClass 完成每日點名（出席、缺席或請假）。</li>
            <li>系統將非出席紀錄同步為待審核缺席，並保留 eClass 原始狀態。</li>
            <li>同步完成後，自動按班整合全校缺席名單，匯出 Excel 並電郵給指定收件人。</li>
            <li>校務處核對醫生證明或家長信，決定是否批准。</li>
            <li>獲批請假不計入出席率及 9 天／4.5 天上限；未批准或缺席則計入。</li>
            <li>達上限一半或超過上限時，自動發出警告信並通知校務處跟進。</li>
            <li>班主任登入後只可檢閱班級出勤，不能改動數據。</li>
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-medium">同步紀錄</h2>
        {state.syncLogs.map((log) => (
          <div key={log.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">{formatDate(log.schoolDay)} 上課日</p>
            <p className="mt-1 text-sm text-muted-foreground">
              同步時間 {formatDateTime(log.syncedAt)}　出席 {log.present}　缺席 {log.absent}　請假 {log.leave}
            </p>
            <p className="mt-2 text-sm">{log.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
