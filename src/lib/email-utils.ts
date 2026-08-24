import type { DigestRecipient } from "@/lib/types";

export function parseEmailAddresses(input: string): string[] {
  return [...new Set(input.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean))];
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function toMailRecipients(emails: string[]) {
  return emails.map((email) => ({
    name: email.split("@")[0] || email,
    email,
  }));
}

export function recipientIdForEmail(email: string) {
  return `rcpt-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function resolveSendRecipients(
  saved: DigestRecipient[],
  extraInput: string
): Array<{ name: string; email: string }> {
  const recipients: Array<{ name: string; email: string }> = [];
  const seen = new Set<string>();

  for (const item of saved) {
    if (!item.enabled) continue;
    const key = item.email.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ name: item.name, email: item.email });
  }

  for (const email of parseEmailAddresses(extraInput)) {
    if (!isValidEmail(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ name: email.split("@")[0] || email, email });
  }

  return recipients;
}

export function createRecipientFromEmail(email: string, enabled = true): DigestRecipient {
  const trimmed = email.trim();
  return {
    id: recipientIdForEmail(trimmed),
    name: trimmed.split("@")[0] || trimmed,
    email: trimmed,
    title: "收件人",
    enabled,
    updatedAt: new Date().toISOString(),
  };
}

export function persistRecipientEmails(
  raw: string,
  saved: DigestRecipient[],
  upsertRecipient: (recipient: DigestRecipient) => void
) {
  for (const email of parseEmailAddresses(raw).filter(isValidEmail)) {
    const existing = saved.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    );
    upsertRecipient(
      existing ? { ...existing, enabled: true } : createRecipientFromEmail(email, true)
    );
  }
}
