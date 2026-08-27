"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthLandingShell } from "@/components/auth-landing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { PageSkeleton } from "@/components/page-shell";

export default function LoginPage() {
  const { state, login, currentUser, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && currentUser) router.replace("/dashboard");
  }, [ready, currentUser, router]);

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
        <PageSkeleton tiles={2} lines={2} />
      </div>
    );
  }

  return (
    <AuthLandingShell wide subtitle="學生出勤與請假管理平台　2026-2027 學年">
      <div className="grid gap-4 md:grid-cols-2">
        {state.users.map((user) => (
          <Card
            key={user.id}
            className="transition-all duration-200 hover:ring-slate-300/80"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription>{user.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                {user.role === "office"
                  ? "全權管理缺席紀錄、文件審核、警告信跟進與報表電郵。"
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

      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm leading-6 text-slate-400">
        老師進入本平台後，可自行選擇要查看的班別。
        <br />
        出勤資料儲存於雲端資料庫，校務處與老師可檢視同一份最新紀錄。
      </p>
    </AuthLandingShell>
  );
}
