import type { ReactNode } from "react";
import { SchoolLogo } from "@/components/school-logo";
import { cn } from "@/lib/utils";

export function AuthLandingShell({
  subtitle,
  children,
  wide = false,
}: {
  subtitle: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/school-background-light.jpg')] bg-cover bg-center bg-no-repeat opacity-30"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-slate-50/70" />

      <div
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col justify-center px-4 py-10 sm:py-14",
          wide ? "max-w-4xl" : "max-w-md"
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
          <div className="border-b border-slate-100 px-6 pb-7 pt-8 sm:px-10 sm:pt-10">
            <SchoolLogo className="mx-auto h-auto w-full max-w-[280px] sm:max-w-[320px]" />
            <p className="mt-5 text-center text-sm leading-relaxed text-slate-600">{subtitle}</p>
          </div>
          <div className="px-6 py-7 sm:px-10 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
