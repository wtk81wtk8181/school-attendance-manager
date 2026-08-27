"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-shell";
import { useStore, rehydrateStore } from "@/lib/store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, usingDatabase } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const retried = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/");
  }, [ready, currentUser, router]);

  useEffect(() => {
    if (!ready || usingDatabase || retried.current) return;
    retried.current = true;
    void rehydrateStore();
  }, [ready, usingDatabase]);

  if (!ready) {
    return (
      <div className="min-h-full bg-slate-50 p-6 md:p-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!currentUser) return null;

  if (pathname.includes("/print")) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
