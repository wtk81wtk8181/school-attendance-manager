"use client";

import { History, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ChangesPage() {
  const { currentUser, state } = useStore();
  const logs = state.auditLogs ?? [];

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="沒有檢視權限"
        description="「最近變更」只供校務處職員查閱。"
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">最近變更</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          記錄各使用者在平台上的操作：誰在什麼時間做了什麼變更。最多保留最近 500 條。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            變更紀錄
          </CardTitle>
          <CardDescription>共 {logs.length} 條，按時間倒序排列。</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              暫時沒有變更紀錄。當使用者登記缺席、審核文件、管理教職員或寄出電郵時，會在此顯示。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">時間</TableHead>
                  <TableHead className="w-32">使用者</TableHead>
                  <TableHead className="w-48">動作</TableHead>
                  <TableHead>內容</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(log.at)}
                    </TableCell>
                    <TableCell>{log.actorName}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm">{log.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
