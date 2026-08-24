const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(iso: string): string {
  return dateFormatter.format(parseIsoDate(iso));
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(parseIsoDate(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function parseIsoDate(iso: string): Date {
  if (iso.includes("T")) return new Date(iso);
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function escapeCsv(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
