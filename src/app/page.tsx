"use client";

import { useRouter } from "next/navigation";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useEffect } from "react";

export default function LoginPage() {
  const { state, login, currentUser, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && currentUser) router.replace("/dashboard");
  }, [ready, currentUser, router]);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[var(--school-navy)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #c4a35a33, transparent 40%), radial-gradient(circle at 80% 0%, #ffffff14, transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
        <header className="mb-10 text-center text-white">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--school-gold)] text-[var(--school-navy)]">
            <School className="size-7" />
          </div>
          <p className="text-xs tracking-[0.35em] text-[var(--school-gold)]">
            {SCHOOL_NAME_EN}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-wide md:text-4xl">
            {SCHOOL_NAME}
          </h1>
          <p className="mt-2 text-white/75">學生出勤與請假管理平台　2026-2027學年</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {state.users.map((user) => (
            <Card key={user.id} className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {user.role === "office"
                    ? "全權管理缺席紀錄、文件審核、警告信跟進與 eClass 數據同步。"
                    : "登入後選擇班別，檢閱該班出勤率與缺席詳情，不能編輯。"}
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    login(user.id);
                    router.push("/dashboard");
                  }}
                >
                  {user.role === "office" ? "以校務處及學生部登入" : "以老師登入"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm leading-6 text-white/65">
          日常點名仍在 eClass 完成。老師進入本平台後，可自行選擇要查看的班別。
          <br />
          此為校園示範環境，數據儲存於本機瀏覽器。
        </p>
      </div>
    </div>
  );
}
