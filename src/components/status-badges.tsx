import { cn } from "@/lib/utils";
import type { DocumentType, ReviewStatus, WarningStatus, WarningType } from "@/lib/types";

const reviewStyles: Record<ReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
};

const reviewLabels: Record<ReviewStatus, string> = {
  pending: "待審核",
  approved: "已批准",
  rejected: "未批准",
};

const documentLabels: Record<DocumentType, string> = {
  doctor: "醫生證明",
  parent: "家長信",
  none: "無文件",
};

const warningTypeLabels: Record<WarningType, string> = {
  half_limit: "缺席預警",
  over_limit: "缺席超過上限",
  frequent_absence: "缺席逾3次",
  frequent_late: "遲到逾3次",
  frequent: "缺席逾3次",
};

const warningStatusLabels: Record<WarningStatus, string> = {
  issued: "待跟進",
  followed_up: "已跟進",
  archived: "已存檔",
};

export function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return <StatusPill className={reviewStyles[status]}>{reviewLabels[status]}</StatusPill>;
}

export function DocumentBadge({ type }: { type: DocumentType }) {
  return (
    <StatusPill
      className={
        type === "none"
          ? "bg-slate-50 text-slate-600 ring-slate-200"
          : "bg-sky-50 text-sky-800 ring-sky-200"
      }
    >
      {documentLabels[type]}
    </StatusPill>
  );
}

export function WarningTypeBadge({ type }: { type: WarningType }) {
  return (
    <StatusPill
      className={
        type === "over_limit"
          ? "bg-rose-50 text-rose-800 ring-rose-200"
          : type === "frequent_late"
            ? "bg-violet-50 text-violet-800 ring-violet-200"
            : type === "frequent_absence" || type === "frequent"
              ? "bg-purple-50 text-purple-800 ring-purple-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
      }
    >
      {warningTypeLabels[type]}
    </StatusPill>
  );
}

export function WarningStatusBadge({ status }: { status: WarningStatus }) {
  return (
    <StatusPill
      className={
        status === "issued"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : status === "followed_up"
            ? "bg-sky-50 text-sky-800 ring-sky-200"
            : "bg-slate-50 text-slate-600 ring-slate-200"
      }
    >
      {warningStatusLabels[status]}
    </StatusPill>
  );
}

export function LevelBadge({ level }: { level: "ok" | "warning" | "over" }) {
  const map = {
    ok: { label: "正常", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
    warning: { label: "預警", className: "bg-amber-50 text-amber-800 ring-amber-200" },
    over: { label: "超過上限", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  };
  return <StatusPill className={map[level].className}>{map[level].label}</StatusPill>;
}

export { reviewLabels, documentLabels, warningTypeLabels, warningStatusLabels };
