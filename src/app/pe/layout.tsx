import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PeShell } from "@/components/pe/pe-shell";

export const metadata: Metadata = {
  title: "體育選修科 MC Trainer｜萬鈞伯裘書院",
  description: "HKDSE 體育選修科人體選擇題練習，隨機抽題、即時解釋。",
};

export default function PeLayout({ children }: { children: ReactNode }) {
  return <PeShell>{children}</PeShell>;
}
