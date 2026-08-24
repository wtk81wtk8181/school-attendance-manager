"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildDigest } from "@/lib/digest";
import { downloadBase64Xlsx, requestDigestSend } from "@/lib/digest-client";
import { useStore } from "@/lib/store";
import type { DigestTrigger } from "@/lib/types";

export function useAbsenceDigest() {
  const { state, recordDigestSend } = useStore();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (options: {
      schoolDay: string;
      sendEmail: boolean;
      trigger: DigestTrigger;
      download?: boolean;
    }) => {
      const payload = buildDigest(state.students, state.absences, options.schoolDay);
      const recipients = state.digestRecipients.filter((item) => item.enabled);
      if (options.sendEmail && recipients.length === 0) {
        toast.error("請先加入至少一位收件人。");
        return null;
      }

      setBusy(true);
      try {
        const result = await requestDigestSend({
          payload,
          recipients: recipients.map((item) => ({
            name: item.name,
            email: item.email,
          })),
          sendEmail: options.sendEmail,
        });

        if (options.sendEmail) {
          recordDigestSend({
            schoolDay: options.schoolDay,
            trigger: options.trigger,
            filename: result.filename,
            recipientEmails: recipients.map((item) => item.email),
            classCount: payload.summaries.length,
            rowCount: payload.rows.length,
            mode: result.mode,
            note: "已透過 SMTP 寄出 Excel 附件。",
          });
          toast.success(`已電郵 ${result.filename} 予 ${result.recipientCount} 人。`);
        } else {
          toast.success(`已匯出 ${result.filename}`);
        }

        if (options.download || !options.sendEmail) {
          downloadBase64Xlsx(result.filename, result.fileBase64);
        }
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "無法處理缺席名單。");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [recordDigestSend, state.absences, state.digestRecipients, state.students]
  );

  return { busy, run };
}
