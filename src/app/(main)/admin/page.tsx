"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Eye,
  Lock,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  attachCurrentCounts,
  collectAdminColumns,
  parseAdminJsonPatch,
  type AdminJsonPatchPreview,
} from "@/lib/admin-json-patch";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { hongKongToday } from "@/lib/digest";
import { toast } from "sonner";

type Row = Record<string, unknown>;
const PAGE_SIZE = 50;

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
  { key: "studentLeaveRecords", label: "學生預先請假" },
  { key: "hiddenStudents", label: "連續缺席隱藏學生" },
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
  const {
    currentUser,
    state,
    adminPatchState,
    adminPatchSections,
    adminApplyDemoAttendance,
    updateAdminMemo,
    saveToDatabase,
    ready,
    pendingSave,
  } = useStore();
  const [sectionKey, setSectionKey] = useState<keyof AppState>("students");
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonPreview, setJsonPreview] = useState<AdminJsonPatchPreview | null>(null);
  const [jsonError, setJsonError] = useState("");
  const [jsonSaving, setJsonSaving] = useState(false);
  const [demoDay, setDemoDay] = useState(hongKongToday());
  const [demoBusy, setDemoBusy] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());

  const sectionRows = useMemo(() => {
    const value: unknown = state[sectionKey];
    return Array.isArray(value) ? (value as unknown as Row[]) : [];
  }, [state, sectionKey]);

  const rows = draft ?? sectionRows;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const visibleRows = rows.slice(pageStart, pageStart + PAGE_SIZE);
  const pageRowIndexes = useMemo(
    () => visibleRows.map((_, index) => pageStart + index),
    [pageStart, visibleRows]
  );
  const allPageSelected =
    pageRowIndexes.length > 0 && pageRowIndexes.every((index) => selectedRows.has(index));
  const somePageSelected =
    pageRowIndexes.some((index) => selectedRows.has(index)) && !allPageSelected;
  const columns = useMemo(
    () => collectAdminColumns(String(sectionKey), rows),
    [rows, sectionKey]
  );

  useEffect(() => {
    setMemoDraft(state.adminMemo ?? "");
  }, [state.adminMemo]);

  if (!ready) return <PageSkeleton tiles={0} lines={8} />;

  if (currentUser?.role !== "office") {
    return (
      <PageShell>
        <EmptyState
          icon={Lock}
          title="沒有檢視權限"
          description="後台管理只供校務處職員使用。"
        />
      </PageShell>
    );
  }

  function selectSection(key: keyof AppState) {
    if (draft) {
      toast.error("請先儲存或還原目前的修改。");
      return;
    }
    setSectionKey(key);
    setPage(0);
    setSelectedRows(new Set());
  }

  function toggleRowSelection(rowIndex: number, selected: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (selected) next.add(rowIndex);
      else next.delete(rowIndex);
      return next;
    });
  }

  function togglePageSelection(selected: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);
      for (const rowIndex of pageRowIndexes) {
        if (selected) next.add(rowIndex);
        else next.delete(rowIndex);
      }
      return next;
    });
  }

  function selectAllRows() {
    setSelectedRows(new Set(rows.map((_, index) => index)));
  }

  function clearRowSelection() {
    setSelectedRows(new Set());
  }

  function deleteSelectedRows() {
    if (selectedRows.size === 0) {
      toast.error("請先勾選要刪除的列。");
      return;
    }
    const confirmed = window.confirm(
      `確定刪除已選的 ${selectedRows.size} 列？刪除後請按「儲存變更」才會寫入資料庫。`
    );
    if (!confirmed) return;
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    const indexes = new Set(selectedRows);
    setDraft(base.filter((_, index) => !indexes.has(index)));
    setSelectedRows(new Set());
    toast.success(`已從試算表移除 ${indexes.size} 列，請記得儲存變更。`);
  }

  function updateCell(rowIndex: number, column: string, text: string) {
    const base = draft ?? sectionRows;
    setDraft(
      base.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [column]: parseCell(text, row[column]),
            }
          : { ...row }
      )
    );
  }

  function addRow() {
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    const template: Row = {};
    for (const column of columns) template[column] = "";
    if (!template.id) template.id = `row-${Date.now()}`;
    if (sectionKey === "absences") {
      template.eclassStatus = template.eclassStatus || "absent";
      template.days = template.days === "" ? 1 : template.days;
      template.date = template.date || hongKongToday();
      template.documentType = template.documentType || "none";
      template.documentSubmitted = false;
      template.reviewStatus = template.reviewStatus || "pending";
      template.source = template.source || "office";
      template.reason = template.reason || "缺席";
    }
    setDraft([...base, template]);
  }

  function deleteRow(rowIndex: number) {
    const base = draft ?? sectionRows.map((row) => ({ ...row }));
    setDraft(base.filter((_, index) => index !== rowIndex));
    setSelectedRows((current) => {
      const next = new Set<number>();
      for (const index of current) {
        if (index < rowIndex) next.add(index);
        else if (index > rowIndex) next.add(index - 1);
      }
      return next;
    });
  }

  function save() {
    if (!draft) return;
    const ok = adminPatchState({ section: sectionKey, rows: draft });
    if (ok) {
      setDraft(null);
      setSelectedRows(new Set());
    }
  }

  function previewJsonPatch() {
    const result = parseAdminJsonPatch(jsonInput);
    if (!result.ok) {
      setJsonPreview(null);
      setJsonError(result.error);
      toast.error(result.error);
      return;
    }
    const preview = attachCurrentCounts(result.preview, state);
    setJsonPreview(preview);
    setJsonError("");
    toast.success("JSON 已通過檢查，請確認後才套用。");
  }

  async function applyJsonPatch() {
    if (!jsonPreview) {
      toast.error("請先按「預覽」確認 JSON 內容。");
      return;
    }
    if (draft) {
      toast.error("請先儲存或還原試算表的修改，再套用 JSON。");
      return;
    }
    const shrinks = jsonPreview.summary.filter((item) => item.nextCount < item.currentCount);
    if (shrinks.length > 0) {
      const detail = shrinks
        .map((item) => `${item.label} ${item.currentCount}→${item.nextCount}`)
        .join("、");
      const confirmed = window.confirm(
        `以下資料表列數會減少（${detail}）。這會整段覆寫並同步至雲端，確定繼續？`
      );
      if (!confirmed) return;
    }
    const ok = adminPatchSections(jsonPreview.sections as Record<string, unknown[]>);
    if (!ok) return;
    setJsonSaving(true);
    try {
      const saved = await saveToDatabase();
      if (!saved) {
        toast.error("已套用本機修改，但未能確定寫入資料庫。請按頂部「確定儲存」再試。");
        return;
      }
      setJsonInput("");
      setJsonPreview(null);
      setJsonError("");
    } finally {
      setJsonSaving(false);
    }
  }

  function exportCurrentJson() {
    const current = Array.isArray(state[sectionKey])
      ? (state[sectionKey] as unknown[])
      : [];
    setJsonInput(
      JSON.stringify(
        {
          section: sectionKey,
          rows: current,
        },
        null,
        2
      )
    );
    setJsonPreview(null);
    setJsonError("");
    toast.success(`已匯出目前「${SECTIONS.find((item) => item.key === sectionKey)?.label ?? sectionKey}」JSON，修改後請先預覽再套用。`);
  }

  async function runDemoAttendance() {
    if (draft) {
      toast.error("請先儲存或還原試算表的修改，再產生示範資料。");
      return;
    }
    const confirmed = window.confirm(
      `將為 ${demoDay} 隨機產生示範資料：每班 10 名學生（缺席、遲到、早退、半日缺席）及 7 名教職員請假／公假等。\n\n會覆寫該日既有的學生缺席及教職員每日缺席紀錄，其他日子不受影響。確定繼續？`
    );
    if (!confirmed) return;

    const ok = adminApplyDemoAttendance(demoDay);
    if (!ok) return;

    setDemoBusy(true);
    try {
      const saved = await saveToDatabase();
      if (!saved) {
        toast.error("已產生本機示範資料，但未能確定寫入資料庫。請按頂部「確定儲存」再試。");
      }
    } finally {
      setDemoBusy(false);
    }
  }

  async function saveMemo() {
    updateAdminMemo(memoDraft);
    setMemoSaving(true);
    try {
      const saved = await saveToDatabase();
      if (!saved && pendingSave) {
        toast.message("備註已儲存於本機，稍後會同步至資料庫。");
      } else if (saved) {
        toast.success("備註已儲存。");
      }
    } finally {
      setMemoSaving(false);
    }
  }

  return (
    <PageShell wide>
      <PageHeader
        title="後台管理"
        description="以試算表方式檢視及修改資料庫內的所有資料。修改後請按「儲存變更」才會同步至雲端。"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                資料表
              </CardTitle>
              <CardDescription>
                共 {rows.length} 列{draft ? "（有未儲存修改）" : ""}
                {selectedRows.size > 0 ? `　已選 ${selectedRows.size} 列` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sectionKey}
                onValueChange={(value) => {
                  if (value) selectSection(value as keyof AppState);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
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
              {rows.length > 0 ? (
                <>
                  <Button variant="outline" size="sm" onClick={selectAllRows}>
                    全選全部
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearRowSelection}
                    disabled={selectedRows.size === 0}
                  >
                    清除選取
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedRows}
                    disabled={selectedRows.size === 0}
                  >
                    <Trash2 className="size-4" />
                    批量刪除{selectedRows.size > 0 ? `（${selectedRows.size}）` : ""}
                  </Button>
                </>
              ) : null}
              {draft && (
                <>
                  <Button size="sm" onClick={save}>
                    <Save className="size-4" />
                    儲存變更
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setDraft(null);
                    setSelectedRows(new Set());
                  }}>
                    還原
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={Database}
              title="此資料表暫時沒有資料"
              description="可新增一列，或從 JSON 批量匯入。"
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-2 py-1.5 text-center">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={(checked) => togglePageSelection(checked === true)}
                        aria-label="全選本頁"
                        title={somePageSelected ? "本頁部分已選" : "全選本頁"}
                      />
                    </th>
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
                  {visibleRows.map((row, visibleIndex) => {
                    const rowIndex = pageStart + visibleIndex;
                    return (
                    <tr key={`${rowIndex}-${String(row.id ?? "")}`}>
                      <td className="border px-2 py-1 text-center">
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={(checked) =>
                            toggleRowSelection(rowIndex, checked === true)
                          }
                          aria-label={`選取第 ${rowIndex + 1} 列`}
                        />
                      </td>
                      <td className="border px-2 py-1 text-slate-400">{rowIndex + 1}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <p className="text-slate-400">
                顯示第 {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rows.length)} 列，
                共 {rows.length} 列
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  上一頁
                </Button>
                <span>
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount - 1, current + 1))
                  }
                >
                  下一頁
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-5" />
            示範出勤指令
          </CardTitle>
          <CardDescription>
            為指定上課日隨機產生測試資料：每班 10 名學生（缺席、遲到、早退、半日缺席），以及 7 名教職員（病假、事假、公假、早退）。會覆寫該日既有的學生缺席及教職員每日缺席，其他日子不受影響。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="demo-day">上課日</Label>
            <Input
              id="demo-day"
              type="date"
              value={demoDay}
              onChange={(event) => setDemoDay(event.target.value)}
              className="w-44"
            />
          </div>
          <Button disabled={demoBusy} onClick={() => void runDemoAttendance()}>
            <Wand2 className="size-4" />
            {demoBusy ? "產生中……" : "產生示範資料"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="size-5" />
            JSON 批量修改
          </CardTitle>
          <CardDescription>
            貼上完整 JSON 後先預覽，確認無誤才套用。此操作會<strong>整段替換</strong>
            指定資料表，不是合併；貼上時必須包含該表的全部資料列。套用後會立即寫入雲端資料庫。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
            <p className="font-medium text-foreground">支援兩種格式：</p>
            <p>1. 單一資料表：</p>
            <pre className="overflow-x-auto rounded bg-background p-2 text-[11px]">{`{
  "section": "students",
  "rows": [ ...完整學生陣列... ]
}`}</pre>
            <p className="mt-2">2. 多個資料表：</p>
            <pre className="overflow-x-auto rounded bg-background p-2 text-[11px]">{`{
  "students": [ ... ],
  "studentLeaveRecords": [ ... ]
}`}</pre>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(event) => {
              setJsonInput(event.target.value);
              setJsonPreview(null);
              setJsonError("");
            }}
            placeholder='貼上 JSON，例如 {"section":"students","rows":[...]}'
            className="min-h-48 font-mono text-xs"
          />

          {jsonError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {jsonError}
            </p>
          ) : null}

          {jsonPreview ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-medium">預覽結果（尚未寫入）</p>
              <ul className="mt-2 space-y-1">
                {jsonPreview.summary.map((item) => (
                  <li key={item.section}>
                    {item.label}（{item.section}）：{item.currentCount} 列 →{" "}
                    <strong>{item.nextCount} 列</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-900">
                確認後會立即覆寫以上資料表，並寫入雲端資料庫。
                {jsonPreview.summary.some((item) => item.nextCount < item.currentCount)
                  ? " 列數減少表示會刪除現有紀錄。"
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCurrentJson}>
              匯出目前資料表
            </Button>
            <Button variant="outline" size="sm" onClick={previewJsonPatch} disabled={!jsonInput.trim() || jsonSaving}>
              <Eye className="size-4" />
              預覽
            </Button>
            <Button size="sm" onClick={() => void applyJsonPatch()} disabled={!jsonPreview || jsonSaving}>
              {jsonSaving ? "寫入資料庫中……" : "確認套用並寫入資料庫"}
            </Button>
            {jsonPreview ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJsonPreview(null);
                  setJsonError("");
                }}
              >
                取消預覽
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            備註
          </CardTitle>
          <CardDescription>
            共用留言版，任何登入同事都可以在此留下文字備忘，內容會同步至雲端資料庫。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={memoDraft}
            onChange={(event) => setMemoDraft(event.target.value)}
            placeholder="在此輸入任何備註、提醒或留言……"
            className="min-h-36 text-sm leading-6"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              {memoDraft.length > 0 ? `共 ${memoDraft.length} 字` : "尚無內容"}
            </p>
            <Button
              size="sm"
              disabled={memoSaving || memoDraft === (state.adminMemo ?? "")}
              onClick={() => void saveMemo()}
            >
              <Save className="size-4" />
              {memoSaving ? "儲存中……" : "儲存備註"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
