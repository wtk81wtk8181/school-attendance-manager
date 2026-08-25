"use client";

import { useMemo, useState } from "react";
import { Database, Lock, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { toast } from "sonner";

type Row = Record<string, unknown>;

const SECTIONS: Array<{ key: keyof AppState; label: string }> = [
  { key: "students", label: "學生名單" },
  { key: "absences", label: "缺席紀錄" },
  { key: "warnings", label: "警告信" },
  { key: "notifications", label: "通知" },
  { key: "digestRecipients", label: "電郵收件人" },
  { key: "digestLogs", label: "電郵寄出紀錄" },
  { key: "staffMembers", label: "教職員名單" },
  { key: "staffDailyAbsences", label: "教職員每日缺席" },
  { key: "staffLeaveRecords", label: "教職員提早請假" },
  { key: "auditLogs", label: "最近變更" },
];

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseCell(text: string, original: unknown): unknown {
  const trimmed = text.trim();
  if (typeof original === "number") {
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : original;
  }
  if (typeof original === "boolean") {
    if (trimmed === "true" || trimmed === "1") return true;
    if (trimmed === "false" || trimmed === "0") return false;
    return original;
  }
  if (Array.isArray(original) || (original !== null && typeof original === "object")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return original;
    }
  }
  return text;
}

export default function AdminPage() {
  const { currentUser, state, adminPatchState } = useStore();
  const [sectionKey, setSectionKey] = useState<keyof AppState>("students");
  const [draft, setDraft] = useState<Row[] | null>(null);

  const sectionRows = useMemo(() => {
    const value: unknown = state[sectionKey];
    return Array.isArray(value) ? (value as unknown as Row[]) : [];
  }, [state, sectionKey]);

  const rows = draft ?? sectionRows;
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows.slice(0, 50)) {
      for (const key of Object.keys(row)) keys.add(key);
    }
    return [...keys];
  }, [rows]);

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="沒有檢視權限"
        description="後台管理只供校務處職員使用。"
      />
    );
  }

  function selectSection(key: keyof AppState) {
    if (draft) {
      toast.error("請先儲存或還原目前的修改。");
      return;
    }
    setSectionKey(key);
  }

  function updateCell(rowIndex: number, column: string, text: string) {
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    base[rowIndex] = {
      ...base[rowIndex],
      [column]: parseCell(text, base[rowIndex][column]),
    };
    setDraft(base);
  }

  function addRow() {
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    const template: Row = {};
    for (const column of columns) template[column] = "";
    if (!template.id) template.id = `row-${Date.now()}`;
    setDraft([...base, template]);
  }

  function deleteRow(rowIndex: number) {
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    setDraft(base.filter((_, index) => index !== rowIndex));
  }

  function save() {
    if (!draft) return;
    adminPatchState({ section: sectionKey, rows: draft });
    setDraft(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">後台管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          以試算表方式檢視及修改資料庫內的所有資料。修改後請按「儲存變更」才會同步至雲端。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                資料表
              </CardTitle>
              <CardDescription>
                共 {rows.length} 列{draft ? "（有未儲存修改）" : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sectionKey}
                onValueChange={(value) => selectSection(value as keyof AppState)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section.key} value={section.key}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="size-4" />
                新增一列
              </Button>
              {draft && (
                <>
                  <Button size="sm" onClick={save}>
                    <Save className="size-4" />
                    儲存變更
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                    還原
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              此資料表暫時沒有資料。
            </p>
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-2 py-1.5 text-left">#</th>
                    {columns.map((column) => (
                      <th key={column} className="border px-2 py-1.5 text-left whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                    <th className="border px-2 py-1.5">刪除</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${String(row.id ?? "")}`}>
                      <td className="border px-2 py-1 text-muted-foreground">{rowIndex + 1}</td>
                      {columns.map((column) => (
                        <td key={column} className="border p-0">
                          <Input
                            className="h-8 rounded-none border-0 bg-transparent text-xs shadow-none focus-visible:ring-1"
                            value={cellText(row[column])}
                            onChange={(event) =>
                              updateCell(rowIndex, column, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      <td className="border px-1 py-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteRow(rowIndex)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
