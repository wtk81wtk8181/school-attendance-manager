"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { useAbsenceDigest } from "@/hooks/use-absence-digest";
import {
  absenceDates,
  buildDigest,
  resolveDigestSchoolDay,
} from "@/lib/digest";
import { formatDate, formatDateTime, formatShortDate } from "@/lib/format";
import { classLabel } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { createRecipientFromEmail } from "@/lib/email-utils";
import { toast } from "sonner";

export default function DigestPage() {
  const { currentUser, state, saveDigestSettings, upsertRecipient, removeRecipient } =
    useStore();
  const { busy, run } = useAbsenceDigest();
  const dates = absenceDates(state.absences);
  const [schoolDay, setSchoolDay] = useState(
    resolveDigestSchoolDay(state.absences)
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("指定收件人");

  const payload = useMemo(
    () => buildDigest(state.students, state.absences, schoolDay),
    [schoolDay, state.absences, state.students]
  );

  const enabledRecipients = state.digestRecipients.filter((item) => item.enabled);

  if (currentUser?.role !== "office") {
    return (
      <EmptyState
        icon={Lock}
        title="沒有編輯權限"
        description="每日缺席 Excel 電郵由校務處負責設定與寄出。老師請到總覽查看本班待追收文件。"
      />
    );
  }

  function addRecipient() {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("請輸入姓名及有效電郵。");
      return;
    }
    const recipient = createRecipientFromEmail(email.trim(), true);
    upsertRecipient({
      ...recipient,
      name: name.trim() || recipient.name,
      title: title.trim() || "指定收件人",
    });
    setName("");
    setEmail("");
    toast.success("已加入收件人。");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">每日全校缺席名單</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          校務處按班整合全校缺席／請假，匯出 Excel 並電郵給指定對象。
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>上課日名單</CardTitle>
          <CardDescription>
            若當日尚無紀錄，會改用最近一次有缺席的上課日。目前共 {payload.rows.length} 筆。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label>上課日</Label>
            <Select value={schoolDay} onValueChange={(value) => value && setSchoolDay(value)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {formatDate(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run({
                  schoolDay,
                  sendEmail: false,
                  trigger: "manual",
                  download: true,
                })
              }
            >
              <Download className="size-4" />
              匯出 Excel
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run({
                  schoolDay,
                  sendEmail: true,
                  trigger: "manual",
                  download: true,
                })
              }
            >
              <Mail className="size-4" />
              {busy ? "處理中…" : `電郵給 ${enabledRecipients.length} 人`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>班別</TableHead>
              <TableHead>班主任</TableHead>
              <TableHead>缺席</TableHead>
              <TableHead>請假</TableHead>
              <TableHead>待審核</TableHead>
              <TableHead>計入缺席</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payload.summaries.map((item) => (
              <TableRow key={item.className}>
                <TableCell>{item.classLabel}</TableCell>
                <TableCell>{item.teacher}</TableCell>
                <TableCell>{item.absent}</TableCell>
                <TableCell>{item.leave}</TableCell>
                <TableCell>{item.pending}</TableCell>
                <TableCell>{item.counted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {payload.rows.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="該日沒有缺席或請假"
          description="全班出席時，Excel 仍會列出各班工作表，方便校務處存檔。"
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班別</TableHead>
                <TableHead>學生</TableHead>
                <TableHead>eClass</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>審核</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payload.rows.map((row) => (
                <TableRow key={`${row.studentNo}-${row.date}-${row.reason}`}>
                  <TableCell>{row.classLabel}</TableCell>
                  <TableCell>
                    {row.name}
                    <span className="ml-2 text-xs text-muted-foreground">{row.studentNo}</span>
                  </TableCell>
                  <TableCell>
                    {row.eclassStatus}　{row.days} 天
                  </TableCell>
                  <TableCell>{row.reason}</TableCell>
                  <TableCell>{row.reviewStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card className="shadow-none">
            <CardHeader>
              <CardTitle>自動寄出設定</CardTitle>
              <CardDescription>
                每日到達指定時間，自動整合全校各班缺席並電郵 Excel（需設定 SMTP）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={state.digestSettings.enabled}
                  onCheckedChange={(checked) =>
                    saveDigestSettings({ enabled: checked === true })
                  }
                />
                啟用每日自動整合及電郵
              </label>
              <div className="grid max-w-xs gap-1.5">
                <Label htmlFor="send-time">每日寄出時間（香港時間）</Label>
                <Input
                  id="send-time"
                  type="time"
                  value={state.digestSettings.sendTime}
                  onChange={(event) =>
                    saveDigestSettings({ sendTime: event.target.value })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                上次寄出：
                {state.digestSettings.lastSentSchoolDay
                  ? ` ${formatShortDate(state.digestSettings.lastSentSchoolDay)} 上課日`
                  : " 尚未寄出"}
                。真實電郵請在環境變數設定 SMTP_HOST、SMTP_USER、SMTP_PASS。
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>指定收件人</CardTitle>
              <CardDescription>可加入校務處、各班班主任或其他電郵。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  placeholder="姓名"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Input
                  placeholder="電郵"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Input
                  placeholder="職銜"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <Button variant="outline" onClick={addRecipient}>
                  <Plus className="size-4" />
                  加入
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>發送</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>電郵</TableHead>
                    <TableHead>職銜</TableHead>
                    <TableHead className="text-right">移除</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.digestRecipients.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={item.enabled}
                          onCheckedChange={(checked) =>
                            upsertRecipient({ ...item, enabled: checked === true })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {item.name}
                        {item.className ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {classLabel(item.className)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeRecipient(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

      <div className="space-y-3">
        <h2 className="text-base font-medium">寄出紀錄</h2>
        {state.digestLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未有寄出紀錄。</p>
        ) : (
          state.digestLogs.map((log) => (
            <div key={log.id} className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-medium">
                {formatDate(log.schoolDay)}　{log.filename}
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatDateTime(log.createdAt)}　
                {log.trigger === "auto" ? "每日自動" : "手動"}　
                {log.mode === "smtp" ? "SMTP 寄出" : "僅匯出"}　
                {log.rowCount} 筆　{log.recipientEmails.length} 位收件人
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {log.recipientEmails.join("、")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
