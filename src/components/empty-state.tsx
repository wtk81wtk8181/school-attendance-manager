import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 transition-colors">
        <Icon className="size-5 text-slate-400" />
      </div>
      <h2 className="text-sm font-medium text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
