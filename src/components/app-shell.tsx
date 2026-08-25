"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Check,
  ClipboardList,
  Database,
  FileWarning,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  School,
  Users,
  BarChart3,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SCHOOL_NAME } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { DigestScheduler } from "@/components/digest-scheduler";
import { ClassPicker } from "@/components/class-picker";
import { classLabel } from "@/lib/rules";

const officeNav = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/students", label: "學生出勤", icon: Users },
  { href: "/reviews", label: "文件審核", icon: ClipboardList },
  { href: "/warnings", label: "警告信", icon: FileWarning },
  { href: "/reports", label: "報表導出", icon: BarChart3 },
  { href: "/digest", label: "每日缺席電郵", icon: Mail },
  { href: "/changes", label: "最近變更", icon: History },
  { href: "/admin", label: "後台管理", icon: Database },
];

const homeroomNav = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/students", label: "本班出勤", icon: Users },
  { href: "/warnings", label: "警告信", icon: FileWarning },
  { href: "/reports", label: "報表", icon: BarChart3 },
];

function SideNav({
  items,
  pathname,
  onNavigate,
}: {
  items: typeof officeNav;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-white/12 text-white"
                : "text-white/75 hover:bg-white/8 hover:text-white"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    state,
    selectClass,
    logout,
    markNotificationRead,
    markAllNotificationsRead,
    refreshFromDatabase,
    saveToDatabase,
    reconnectDatabase,
    usingDatabase,
    pendingSave,
  } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const nav = currentUser?.role === "office" ? officeNav : homeroomNav;
  const visibleNotes =
    currentUser?.role === "office"
      ? state.notifications
      : state.notifications.filter((item) => {
          if (!item.studentId) return false;
          const student = state.students.find((row) => row.id === item.studentId);
          return student?.className === state.selectedClassName;
        });
  const unread = visibleNotes.filter((item) => !item.read);

  const userInitial = currentUser?.name.slice(0, 1) ?? "";

  return (
    <div className="flex min-h-full bg-[var(--school-paper)]">
      <DigestScheduler />
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-[var(--school-navy)] text-white md:flex">
        <div className="border-b border-white/10 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-1">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--school-gold)] text-[var(--school-navy)]">
              <School className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">{SCHOOL_NAME}</span>
              <span className="block text-[11px] text-white/70">出勤與請假管理</span>
            </span>
          </Link>
        </div>
        <div className="flex-1 py-4">
          <SideNav items={nav} pathname={pathname} />
        </div>
        <p className="px-4 pb-4 text-[11px] text-white/50">
          {state.academicYear.label} 學年　上課 {state.academicYear.schoolDays} 天
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-[var(--school-paper)]/90 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {currentUser?.title}　{currentUser?.name}
              {currentUser?.role === "homeroom" && state.selectedClassName
                ? `　${classLabel(state.selectedClassName)}`
                : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {usingDatabase
                ? `雲端資料庫已連線・${state.students.length} 名學生・${state.absences.length} 筆缺席`
                : "本機模式：另一部裝置看不到這裡的變更"}
            </p>
          </div>
          {usingDatabase ? (
            <>
              {currentUser?.role === "office" ? (
                <Button
                  size="sm"
                  disabled={saving || (!pendingSave && !usingDatabase)}
                  onClick={() => {
                    setSaving(true);
                    void saveToDatabase().finally(() => setSaving(false));
                  }}
                  className={
                    pendingSave
                      ? "bg-[var(--school-navy)] text-white hover:bg-[var(--school-navy)]/90"
                      : undefined
                  }
                  variant={pendingSave ? "default" : "outline"}
                >
                  <Check className={saving ? "size-4 animate-pulse" : "size-4"} />
                  {saving ? "儲存中……" : pendingSave ? "確定儲存" : "已儲存"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={() => {
                  setSyncing(true);
                  void refreshFromDatabase().finally(() => setSyncing(false));
                }}
              >
                <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
                同步資料
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-600 text-amber-800"
              onClick={() => {
                setSyncing(true);
                void reconnectDatabase().finally(() => setSyncing(false));
              }}
            >
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
              連接資料庫
            </Button>
          )}
          {currentUser?.role === "homeroom" && state.selectedClassName ? (
            <Button
              size="lg"
              onClick={() => selectClass(null)}
              className="h-11 gap-2 px-4 text-base font-semibold bg-[var(--school-navy)] text-white shadow-md hover:bg-[var(--school-navy)]/90 hover:text-white"
            >
              <RefreshCw className="size-4" />
              更換班別
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" className="relative" />
              }
            >
              <Bell className="size-4" />
              {unread.length > 0 ? (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] text-white">
                  {unread.length}
                </span>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-sm font-medium">校務通知</p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={markAllNotificationsRead}
                >
                  全部已讀
                </Button>
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-72">
                {visibleNotes.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    目前沒有通知。
                  </p>
                ) : (
                  visibleNotes.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm hover:bg-muted",
                        !item.read && "bg-amber-50/70"
                      )}
                      onClick={() => {
                        markNotificationRead(item.id);
                        if (item.warningId) router.push(`/warnings/${item.warningId}`);
                        else if (item.studentId) router.push(`/students/${item.studentId}`);
                      }}
                    >
                      <span className="block font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </button>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <Home className="size-3.5" />
            返回主頁
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <LogOut className="size-3.5" />
            退出登入
          </Button>
          <span className="hidden size-8 items-center justify-center rounded-full bg-[var(--school-navy)] text-xs font-medium text-white sm:flex">
            {userInitial}
          </span>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0">
          {currentUser?.role === "homeroom" && !state.selectedClassName ? (
            <ClassPicker />
          ) : (
            children
          )}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 border-none bg-[var(--school-navy)] p-0 text-white"
        >
          <SheetHeader className="border-b border-white/10 p-4">
            <SheetTitle className="text-white">{SCHOOL_NAME}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SideNav items={nav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
