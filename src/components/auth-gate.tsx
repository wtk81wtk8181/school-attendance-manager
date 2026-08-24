"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        載入校園數據中……
      </div>
    );
  }

  if (!currentUser) return null;

  if (pathname.includes("/print")) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
