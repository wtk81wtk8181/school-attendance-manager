import type { ReactNode } from "react";
import Link from "next/link";

export function PeShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-slate-800">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-4">
          <Link href="/pe" className="text-center leading-tight">
            <span className="block text-[11px] font-semibold tracking-[0.28em] text-violet-700">PE</span>
            <span className="block text-sm font-semibold text-violet-800">體育選修科 MC Trainer</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-slate-400">
        萬鈞伯裘書院 · 第二部分：人體 · 溫習用途
      </footer>
    </div>
  );
}
