"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AuthLandingShell } from "@/components/auth-landing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rehydrateStore } from "@/lib/store";

export function SiteLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/site-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "密碼錯誤，請再試一次。");
        return;
      }

      await rehydrateStore();
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("無法驗證密碼，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLandingShell subtitle="此平台僅供授權人士使用">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <LockKeyhole className="size-4" />
            </span>
            進入密碼
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            請輸入存取密碼後，才能進入出勤管理系統。
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="site-password">密碼</Label>
            <Input
              id="site-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="請輸入密碼"
              className="h-11"
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            className="h-11 w-full text-base"
            type="submit"
            disabled={loading}
          >
            {loading ? "驗證中……" : "進入系統"}
          </Button>
        </form>
      </div>
    </AuthLandingShell>
  );
}
