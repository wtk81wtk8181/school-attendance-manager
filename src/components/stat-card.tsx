import type { LucideIcon } from "lucide-react";
import { StatTile } from "@/components/page-shell";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return <StatTile label={label} value={value} hint={hint} icon={icon} />;
}
