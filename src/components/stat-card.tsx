import type { LucideIcon } from "lucide-react";
import { StatTile, type StatTone } from "@/components/page-shell";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  return <StatTile label={label} value={value} hint={hint} icon={icon} tone={tone} />;
}
