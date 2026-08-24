import type { DigestPayload } from "@/lib/digest";
import type { DailyReportPayload } from "@/lib/daily-report";
import type { MonthlyReportPayload } from "@/lib/monthly-report";

export interface DigestSendResult {
  ok: boolean;
  mode: "smtp" | "mock";
  emailed: boolean;
  filename: string;
  fileBase64: string;
  recipientCount: number;
  error?: string;
}

interface SendInput<P> {
  payload: P;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}

async function postReport<P>(
  endpoint: string,
  input: SendInput<P>,
  fallbackError: string
): Promise<DigestSendResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as DigestSendResult;
  if (!response.ok) {
    throw new Error(data.error || fallbackError);
  }
  return data;
}

export async function requestDigestSend(input: {
  payload: DigestPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}): Promise<DigestSendResult> {
  return postReport("/api/digest/send", input, "無法產生缺席名單。");
}

export async function requestMonthlyReport(input: {
  payload: MonthlyReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}): Promise<DigestSendResult> {
  return postReport("/api/report/monthly", input, "無法產生每月缺席率報告。");
}

export async function requestDailyReport(input: {
  payload: DailyReportPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}): Promise<Omit<DigestSendResult, "filename" | "fileBase64">> {
  const response = await fetch("/api/report/daily", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as Omit<DigestSendResult, "filename" | "fileBase64"> & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "無法寄出每日缺席報告。");
  }
  return data;
}

export function downloadBase64Xlsx(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
