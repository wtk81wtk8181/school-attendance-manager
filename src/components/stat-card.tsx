import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "bg-[var(--school-navy)]/8 text-[var(--school-navy)]",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    success: "bg-emerald-100 text-emerald-800",
  };

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
