"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Percent, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  appearanceMonthOptions,
  buildAppearanceReport,
} from "@/lib/appearance-report";
import { currentYearMonth } from "@/lib/monthly-report";
import { allClassNames } from "@/lib/roster";
import { downloadBase64Xlsx, requestAppearanceReport } from "@/lib/digest-client";
import { formatPercentExact } from "@/lib/format";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

function rateToInput(rate: number | null): string {
  if (rate === null) return "";
  return (rate * 100).toFixed(2);
}

function parsePercentInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value / 100;
}

export default function AppearancePage() {
  const { currentUser, state, saveAppearanceRates, ready } = useStore();
  const months = useMemo(
    () => appearanceMonthOptions(state.academicYear.start, state.academicYear.end),
    [state.academicYear.end, state.academicYear.start]
  );
  const [month, setMonth] = useState(() => {
    const now = currentYearMonth();
    return months.includes(now) ? now : (months[0] ?? now);
  });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  const report = useMemo(
    () =>
      buildAppearanceReport(
        state.students,
        state.absences,
        state.appearanceRecords,
        month,
        state.academicYear.label
      ),
    [month, state.absences, state.academicYear.label, state.appearanceRecords, state.students]
  );

  const inputs = useMemo(() => {
    if (draft) return draft;
    const next: Record<string, string> = {};
    for (const row of report.classes) {
      next[row.className] = rateToInput(row.appearanceRate);
    }
    return next;
  }, [draft, report.classes]);

  if (!ready) return <PageSkeleton tiles={1} lines={8} />;

  if (currentUser?.role !== "office") {
    return (
      <PageShell>
        <EmptyState
          icon={Lock}
          title="沒有編輯權限"
          description="校服儀容百分率由校務處輸入，再匯出學校樣板報告。"
        />
      </PageShell>
    );
  }

  function collectRates(): Record<string, number> | null {
    const rates: Record<string, number> = {};
    for (const className of allClassNames()) {
      const parsed = parsePercentInput(inputs[className] ?? "");
      if ((inputs[className] ?? "").trim() && parsed === null) {
        toast.error(`${className} 的儀容百分率須為 0 至 100。`);
        return null;
      }
      if (parsed !== null) rates[className] = parsed;
    }
    return rates;
  }

  function saveDraft() {
    const rates = collectRates();
    if (!rates) return false;
    const saved = saveAppearanceRates(month, rates);
    if (saved) setDraft(null);
    return saved;
  }

  async function exportReport() {
    if (!saveDraft()) return;
    setBusy(true);
    try {
      const payload = buildAppearanceReport(
        state.students,
        state.absences,
        Object.entries(collectRates() ?? {}).map(([className, rate]) => ({
          id: `appear-${month}-${className}`,
          yearMonth: month,
          className,
          rate,
          updatedAt: new Date().toISOString(),
        })),
        month,
        state.academicYear.label
      );
      const filled = payload.classes.filter((item) => item.appearanceRate !== null).length;
      const result = await requestAppearanceReport({
        payload,
        sendEmail: false,
        recipients: [],
      });
      downloadBase64Xlsx(result.filename, result.fileBase64);
      toast.success(
        filled === payload.classes.length
          ? `已產生 ${result.filename}`
          : `已產生 ${result.filename}（${filled}/${payload.classes.length} 班已填儀容）`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生儀容百分率報告。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell wide>
      <PageHeader
        title="校服儀容"
        description="出席與守時百分率由系統按該月缺席／遲到計算；校服儀容百分率請在此輸入，再匯出學校樣板 Excel（含圖表）。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void saveDraft()}>
              <Save className="size-4" />
              儲存儀容
            </Button>
            <Button disabled={busy} onClick={() => void exportReport()}>
              <Download className="size-4" />
              {busy ? "產生中……" : "產生 Excel"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4" />
            選擇月份
          </CardTitle>
          <CardDescription>
            儀容欄請填 0 至 100，例如 99.50。空白班別在 Excel 會留空，圖表仍會顯示已填班別。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid max-w-xs flex-1 gap-1.5">
            <Label htmlFor="appearance-month">月份</Label>
            <Input
              id="appearance-month"
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value || currentYearMonth());
                setDraft(null);
              }}
            />
          </div>
          <p className="text-sm text-slate-400">
            {report.monthLabel}　已填儀容 {report.classes.filter((item) => item.appearanceRate !== null).length} /{" "}
            {report.classes.length} 班
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">各班百分率</CardTitle>
          <CardDescription>
            總百份比：守時 {formatPercentExact(report.totals.punctualityRate)}　出席{" "}
            {formatPercentExact(report.totals.attendanceRate)}　儀容{" "}
            {report.totals.appearanceRate === null
              ? "—"
              : formatPercentExact(report.totals.appearanceRate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班別</TableHead>
                <TableHead className="text-right">守時百分率</TableHead>
                <TableHead className="text-right">出席百分率</TableHead>
                <TableHead className="w-40">校服儀容百分率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.classes.map((row) => (
                <TableRow key={row.className}>
                  <TableCell className="font-medium">{row.className}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercentExact(row.punctualityRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercentExact(row.attendanceRate)}
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      placeholder="例如 99.50"
                      value={inputs[row.className] ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...inputs,
                          [row.className]: event.target.value,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>總百份比</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentExact(report.totals.punctualityRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentExact(report.totals.attendanceRate)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {report.totals.appearanceRate === null
                    ? "—"
                    : formatPercentExact(report.totals.appearanceRate)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
