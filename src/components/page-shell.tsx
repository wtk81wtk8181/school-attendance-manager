import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-8 px-1 sm:px-0",
        wide ? "max-w-7xl" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
    </>
  );

  const className = cn(
    "group w-full text-left shadow-none ring-slate-200/80 transition-all duration-200 hover:ring-slate-300/80",
    active && "bg-slate-50/80 ring-slate-900/20"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-xl text-left">
        <Card className={className}>
          <CardContent className="flex items-start gap-3 p-4">{content}</CardContent>
        </Card>
      </button>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-4">{content}</CardContent>
    </Card>
  );
}

export function PageSkeleton({
  tiles = 4,
  lines = 6,
}: {
  tiles?: number;
  lines?: number;
}) {
  return (
    <PageShell>
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {tiles > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: tiles }).map((_, index) => (
            <Card key={index} className="shadow-none ring-slate-200/80">
              <CardContent className="flex items-start gap-3 p-4">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </PageShell>
  );
}
