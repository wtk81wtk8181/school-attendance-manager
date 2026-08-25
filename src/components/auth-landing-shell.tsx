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
    <div className="auth-landing relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1b365d] via-[#2d2458] to-[#12182b]" />
      <div className="pointer-events-none absolute -left-24 top-10 size-[28rem] rounded-full bg-[#8b5cf6]/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 size-80 rounded-full bg-[#c4a35a]/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

      <div
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col justify-center px-4 py-10 sm:py-14",
          wide ? "max-w-4xl" : "max-w-md"
        )}
      >
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.97] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="border-b border-[#ece6f4] bg-gradient-to-b from-white via-[#fcfbfe] to-[#f7f4fa] px-6 pb-7 pt-8 sm:px-10 sm:pt-10">
            <SchoolLogo className="mx-auto h-auto w-full max-w-[300px] sm:max-w-[340px]" />
            <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-[#7c3aed]/50 to-transparent" />
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className="px-6 py-7 sm:px-10 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
