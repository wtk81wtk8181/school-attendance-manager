import type { DigestPayload } from "@/lib/digest";

export interface DigestSendResult {
  ok: boolean;
  mode: "smtp" | "mock";
  emailed: boolean;
  filename: string;
  fileBase64: string;
  recipientCount: number;
  error?: string;
}

export async function requestDigestSend(input: {
  payload: DigestPayload;
  recipients: Array<{ name: string; email: string }>;
  sendEmail: boolean;
}): Promise<DigestSendResult> {
  const response = await fetch("/api/digest/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as DigestSendResult;
  if (!response.ok) {
    throw new Error(data.error || "無法產生缺席名單。");
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
