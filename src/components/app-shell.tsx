"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ClipboardList,
  Database,
  FileWarning,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  RefreshCw,
  Users,
} from "lucide-react";
import { SchoolLogoMark } from "@/components/school-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassPicker } from "@/components/class-picker";
import { DigestScheduler } from "@/components/digest-scheduler";
import { cn } from "@/lib/utils";
import { SCHOOL_NAME } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { classLabel } from "@/lib/rules";

const officeNav = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/students", label: "學生出勤", icon: Users },
  { href: "/reviews", label: "文件審核", icon: ClipboardList },
  { href: "/warnings", label: "警告信", icon: FileWarning },
  { href: "/reports", label: "報表導出", icon: BarChart3 },
  { href: "/appearance", label: "校服儀容", icon: Percent },
  { href: "/pre-leave", label: "預先請假", icon: CalendarClock },
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
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
              active
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
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
    <div className="flex min-h-dvh items-stretch bg-slate-50">
      {currentUser?.role === "office" ? <DigestScheduler /> : null}
      <aside className="no-print hidden min-h-dvh w-60 shrink-0 flex-col self-stretch bg-slate-950 text-white md:flex">
        <div className="border-b border-white/10 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-1">
            <SchoolLogoMark />
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">{SCHOOL_NAME}</span>
              <span className="block text-[11px] text-slate-400">出勤與請假管理</span>
            </span>
          </Link>
        </div>
        <div className="flex-1 py-4">
          <SideNav items={nav} pathname={pathname} />
        </div>
        <p className="px-4 pb-4 text-[11px] text-slate-500">
          {state.academicYear.label} 學年　上課 {state.academicYear.schoolDays} 天
        </p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-50/90 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {currentUser?.title}　{currentUser?.name}
              {currentUser?.role === "homeroom" && state.selectedClassName
                ? `　${classLabel(state.selectedClassName)}`
                : ""}
            </p>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">
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
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : undefined
                  }
                  variant={pendingSave ? "default" : "outline"}
                >
                  <Check className={saving ? "size-4 animate-pulse" : "size-4"} />
                  <span className="hidden sm:inline">{saving ? "儲存中……" : pendingSave ? "確定儲存" : "已儲存"}</span>
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
                <span className="hidden sm:inline">同步資料</span>
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
              <span className="hidden sm:inline">連接資料庫</span>
            </Button>
          )}
          {currentUser?.role === "homeroom" && state.selectedClassName ? (
            <Button
              size="sm"
              onClick={() => selectClass(null)}
              className="gap-2 bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:text-white sm:h-11 sm:px-4 sm:text-base sm:font-semibold"
            >
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">更換班別</span>
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
                  <p className="px-3 py-6 text-center text-sm text-slate-400">
                    目前沒有通知。
                  </p>
                ) : (
                  visibleNotes.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-slate-50",
                        !item.read && "bg-amber-50/70"
                      )}
                      onClick={() => {
                        markNotificationRead(item.id);
                        if (item.warningId) router.push(`/warnings/${item.warningId}`);
                        else if (item.studentId) router.push(`/students/${item.studentId}`);
                      }}
                    >
                      <span className="block font-medium text-slate-900">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-400">
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
            className="hidden md:inline-flex"
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
            <span className="hidden sm:inline">退出登入</span>
          </Button>
          <span className="hidden size-8 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white lg:flex">
            {userInitial}
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 print:p-0">
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
          className="w-64 border-none bg-slate-950 p-0 text-white"
        >
          <SheetHeader className="border-b border-white/10 p-4">
            <SheetTitle className="flex items-center gap-2.5 text-white">
              <SchoolLogoMark />
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{SCHOOL_NAME}</span>
                <span className="block text-[11px] font-normal text-slate-400">出勤與請假管理</span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SideNav items={nav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
