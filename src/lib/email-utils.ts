export function parseEmailAddresses(input: string): string[] {
  return [...new Set(input.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean))];
}

export function toMailRecipients(emails: string[]) {
  return emails.map((email) => ({
    name: email.split("@")[0] || email,
    email,
  }));
}
