import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatTone =
  | "default"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "gold";

const statToneStyles: Record<
  StatTone,
  { icon: string; activeIcon: string; card: string; activeCard: string }
> = {
  default: {
    icon: "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80",
    activeIcon: "bg-slate-900 text-white",
    card: "ring-slate-200/80 hover:ring-slate-300/80",
    activeCard: "bg-slate-50/90 ring-slate-900/15",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700 group-hover:bg-blue-200/80",
    activeIcon: "bg-blue-600 text-white",
    card: "ring-blue-100 hover:ring-blue-200",
    activeCard: "bg-blue-50/80 ring-blue-300/60",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200/80",
    activeIcon: "bg-emerald-600 text-white",
    card: "ring-emerald-100 hover:ring-emerald-200",
    activeCard: "bg-emerald-50/80 ring-emerald-300/60",
  },
  amber: {
    icon: "bg-amber-100 text-amber-800 group-hover:bg-amber-200/80",
    activeIcon: "bg-amber-500 text-white",
    card: "ring-amber-100 hover:ring-amber-200",
    activeCard: "bg-amber-50/80 ring-amber-300/60",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700 group-hover:bg-rose-200/80",
    activeIcon: "bg-rose-600 text-white",
    card: "ring-rose-100 hover:ring-rose-200",
    activeCard: "bg-rose-50/80 ring-rose-300/60",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 group-hover:bg-violet-200/80",
    activeIcon: "bg-violet-600 text-white",
    card: "ring-violet-100 hover:ring-violet-200",
    activeCard: "bg-violet-50/80 ring-violet-300/60",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700 group-hover:bg-sky-200/80",
    activeIcon: "bg-sky-600 text-white",
    card: "ring-sky-100 hover:ring-sky-200",
    activeCard: "bg-sky-50/80 ring-sky-300/60",
  },
  gold: {
    icon: "bg-yellow-100 text-yellow-900 group-hover:bg-yellow-200/80",
    activeIcon: "bg-[var(--school-gold)] text-slate-900",
    card: "ring-yellow-100 hover:ring-yellow-200",
    activeCard: "bg-yellow-50/80 ring-[var(--school-gold)]/50",
  },
};

export type AccentCardTone = StatTone | "navy";

const accentCardTopBar: Record<AccentCardTone, string> = {
  navy: "from-[var(--school-navy)] via-slate-600 to-slate-400",
  default: "from-slate-700 to-slate-400",
  blue: "from-blue-600 via-blue-500 to-sky-400",
  emerald: "from-emerald-600 via-emerald-500 to-teal-400",
  amber: "from-amber-500 via-amber-400 to-orange-400",
  rose: "from-rose-600 via-rose-500 to-pink-400",
  violet: "from-violet-600 via-violet-500 to-purple-400",
  sky: "from-sky-600 via-sky-500 to-cyan-400",
  gold: "from-[var(--school-gold)] via-amber-400 to-yellow-300",
};

const accentCardRing: Record<AccentCardTone, string> = {
  navy: "ring-slate-200/90 hover:ring-slate-300/90",
  default: "ring-slate-200/90 hover:ring-slate-300/90",
  blue: "ring-blue-200/70 hover:ring-blue-300/80",
  emerald: "ring-emerald-200/70 hover:ring-emerald-300/80",
  amber: "ring-amber-200/70 hover:ring-amber-300/80",
  rose: "ring-rose-200/70 hover:ring-rose-300/80",
  violet: "ring-violet-200/70 hover:ring-violet-300/80",
  sky: "ring-sky-200/70 hover:ring-sky-300/80",
  gold: "ring-yellow-200/80 hover:ring-[var(--school-gold)]/50",
};

const accentCardSide: Record<AccentCardTone, string> = {
  navy: "from-[var(--school-navy)]/80 to-slate-400/20",
  default: "from-slate-600/70 to-slate-300/10",
  blue: "from-blue-600/80 to-sky-400/10",
  emerald: "from-emerald-600/80 to-teal-400/10",
  amber: "from-amber-500/80 to-orange-400/10",
  rose: "from-rose-600/80 to-pink-400/10",
  violet: "from-violet-600/80 to-purple-400/10",
  sky: "from-sky-600/80 to-cyan-400/10",
  gold: "from-[var(--school-gold)]/90 to-amber-300/10",
};

export function AccentCard({
  accent = "navy",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card> & { accent?: AccentCardTone }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 bg-white/95 pt-1 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-px hover:shadow-md",
        accentCardRing[accent],
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accentCardTopBar[accent])}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b",
          accentCardSide[accent]
        )}
      />
      {children}
    </Card>
  );
}

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
      <div className="flex min-w-0 gap-3">
        <div
          aria-hidden
          className="mt-1 hidden h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[var(--school-gold)] via-amber-400 to-[var(--school-navy)] sm:block"
        />
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--school-navy)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
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
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  tone?: StatTone;
}) {
  const styles = statToneStyles[tone];

  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active ? styles.activeIcon : styles.icon
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
    </>
  );

  const className = cn(
    "group w-full text-left shadow-none transition-all duration-200",
    active ? styles.activeCard : styles.card
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
