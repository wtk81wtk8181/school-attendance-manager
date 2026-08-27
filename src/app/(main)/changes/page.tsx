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
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ChangesPage() {
  const { currentUser, state, ready } = useStore();
  const logs = state.auditLogs ?? [];

  if (!ready) return <PageSkeleton tiles={0} lines={6} />;

  if (currentUser?.role !== "office") {
    return (
      <PageShell>
        <EmptyState
          icon={Lock}
          title="沒有檢視權限"
          description="「最近變更」只供校務處職員查閱。"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="最近變更"
        description="記錄各使用者在平台上的操作：誰在什麼時間做了什麼變更。最多保留最近 500 條。"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-slate-400" />
            變更紀錄
          </CardTitle>
          <CardDescription>共 {logs.length} 條，按時間倒序排列。</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="暫時沒有變更紀錄"
              description="當使用者登記缺席、審核文件、管理教職員或寄出電郵時，會在此顯示。"
              className="border-0 bg-transparent py-10"
            />
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
                    <TableCell className="text-xs text-slate-400">
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
    </PageShell>
  );
}
