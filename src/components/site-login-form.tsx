"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
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
    <div className="relative flex min-h-full flex-1 flex-col bg-[var(--school-navy)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #c4a35a33, transparent 40%), radial-gradient(circle at 80% 0%, #ffffff14, transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <header className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--school-gold)] text-[var(--school-navy)]">
            <School className="size-7" />
          </div>
          <p className="text-xs tracking-[0.35em] text-[var(--school-gold)]">
            {SCHOOL_NAME_EN}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-wide">{SCHOOL_NAME}</h1>
          <p className="mt-2 text-sm text-white/75">此平台僅供授權人士使用</p>
        </header>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="size-5" />
              進入密碼
            </CardTitle>
            <CardDescription>請輸入存取密碼後，才能進入出勤管理系統。</CardDescription>
          </CardHeader>
          <CardContent>
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
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "驗證中……" : "進入系統"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
