"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRecipientFromEmail,
  isValidEmail,
  parseEmailAddresses,
} from "@/lib/email-utils";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface EmailRecipientPickerProps {
  idPrefix: string;
  extraEmail: string;
  onExtraEmailChange: (value: string) => void;
}

export function EmailRecipientPicker({
  idPrefix,
  extraEmail,
  onExtraEmailChange,
}: EmailRecipientPickerProps) {
  const { state, upsertRecipient } = useStore();
  const [saving, setSaving] = useState(false);

  function saveTypedEmails(raw: string, clearInput = true) {
    const emails = parseEmailAddresses(raw).filter(isValidEmail);
    if (emails.length === 0) {
      if (raw.trim()) toast.error("請輸入有效電郵地址。");
      return false;
    }

    setSaving(true);
    for (const email of emails) {
      const existing = state.digestRecipients.find(
        (item) => item.email.toLowerCase() === email.toLowerCase()
      );
      if (existing) {
        upsertRecipient({ ...existing, enabled: true });
      } else {
        upsertRecipient(createRecipientFromEmail(email, true));
      }
    }
    if (clearInput) onExtraEmailChange("");
    setSaving(false);
    toast.success(emails.length > 1 ? `已儲存 ${emails.length} 個電郵。` : "已儲存電郵。");
    return true;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveTypedEmails(extraEmail);
  }

  function handleBlur() {
    if (!extraEmail.trim()) return;
    saveTypedEmails(extraEmail);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-[var(--school-paper)] p-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>新增電郵（Enter 或離開欄位後自動儲存）</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="example@school.edu.hk"
          value={extraEmail}
          disabled={saving}
          onChange={(event) => onExtraEmailChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>

      {state.digestRecipients.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">已儲存收件人（可勾選多個）</p>
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {state.digestRecipients.map((item) => (
              <label
                key={item.id}
                htmlFor={`${idPrefix}-${item.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
              >
                <Checkbox
                  id={`${idPrefix}-${item.id}`}
                  checked={item.enabled}
                  onCheckedChange={(checked) =>
                    upsertRecipient({ ...item, enabled: checked === true })
                  }
                />
                <span className="min-w-0 flex-1 truncate">{item.email}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">輸入電郵後會自動儲存，下次可直接勾選。</p>
      )}
    </div>
  );
}
