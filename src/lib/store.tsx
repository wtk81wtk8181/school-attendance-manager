"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { classLabel, countedAbsenceDays, neededWarningTypes } from "@/lib/rules";
import { hongKongToday } from "@/lib/digest";
import { createSeed, STORAGE_KEY } from "@/lib/seed";
import {
  mergeSharedState,
  readSession,
  sharedFromState,
  writeSession,
} from "@/lib/db-client";
import type {
  AbsenceRecord,
  AppState,
  DigestLog,
  DigestRecipient,
  DayAttendance,
  DigestSettings,
  DocumentType,
  ReviewStatus,
  Student,
  User,
  WarningLetter,
} from "@/lib/types";

interface ReviewInput {
  documentType: DocumentType;
  documentSubmitted: boolean;
  reviewStatus: ReviewStatus;
  days: 0.5 | 1;
  reason: string;
  notes: string;
  calledBy: string;
  calledAt: string;
}

interface FollowUpInput {
  notes: string;
  archive: boolean;
}

interface StoreValue {
  ready: boolean;
  state: AppState;
  currentUser: User | null;
  visibleStudents: Student[];
  login: (userId: string) => void;
  logout: () => void;
  selectClass: (className: string | null) => void;
  reviewAbsence: (id: string, input: ReviewInput) => void;
  setDayAttendance: (studentId: string, date: string, status: DayAttendance) => void;
  updateAbsenceDetails: (
    id: string,
    input: { reason: string; calledBy: string; calledAt: string }
  ) => void;
  followUpWarning: (id: string, input: FollowUpInput) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  simulateSync: () => void;
  resetDemo: () => void;
  saveDigestSettings: (settings: Partial<DigestSettings>) => void;
  upsertRecipient: (recipient: DigestRecipient) => void;
  removeRecipient: (id: string) => void;
  recordDigestSend: (log: Omit<DigestLog, "id" | "createdAt">) => void;
}

const StoreContext = createContext<StoreValue | null>(null);
const serverSnapshot = createSeed();
const listeners = new Set<() => void>();
let memory: AppState = serverSnapshot;
let hydrated = false;
let useDatabase = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistSession(state: AppState) {
  writeSession(state);
}

function persistLocal(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistShared(state: AppState) {
  persistSession(state);
  if (!useDatabase) {
    persistLocal(state);
    return;
  }
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: sharedFromState(state) }),
    }).catch(() => {
      persistLocal(state);
    });
  }, 400);
}

function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = readSession();
    if (!raw) {
      const seed = createSeed();
      return { ...seed, ...session };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed.students || !parsed.absences) {
      const seed = createSeed();
      return { ...seed, ...session };
    }
    const merged = mergeSharedState(parsed);
    const legacyTeacher =
      parsed.currentUserId === "u-1a"
        ? "1A"
        : parsed.currentUserId === "u-6a"
          ? "6A"
          : null;
    const currentUserId =
      session.currentUserId ??
      (parsed.currentUserId === "u-1a" || parsed.currentUserId === "u-6a"
        ? "u-teacher"
        : (parsed.currentUserId ?? null));
    return {
      ...merged,
      currentUserId,
      selectedClassName:
        session.selectedClassName ?? parsed.selectedClassName ?? legacyTeacher,
    };
  } catch {
    return createSeed();
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function getReadySnapshot() {
  return hydrated;
}

function getReadyServerSnapshot() {
  return false;
}

function assign(next: AppState) {
  memory = next;
  if (hydrated) persistShared(memory);
  emit();
}

function patch(updater: (prev: AppState) => AppState) {
  assign(updater(memory));
}

async function hydrateFromStorage() {
  const session = readSession();
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { state: AppState; database: boolean };
      useDatabase = Boolean(data.database);
      memory = {
        ...mergeSharedState(data.state),
        currentUserId: session.currentUserId,
        selectedClassName: session.selectedClassName,
      };
      if (!useDatabase) {
        memory = loadLocalState();
      }
    } else {
      memory = loadLocalState();
    }
  } catch {
    memory = loadLocalState();
  }
  hydrated = true;
  emit();
}

function nowIso() {
  return new Date().toISOString();
}

function applyWarnings(
  state: AppState,
  student: Student,
  actorName: string
): AppState {
  const records = state.absences.filter((item) => item.studentId === student.id);
  const counted = countedAbsenceDays(records);
  const needed = neededWarningTypes(counted, student.form);
  const existing = new Set(
    state.warnings
      .filter((item) => item.studentId === student.id)
      .map((item) => item.type)
  );

  const fresh: WarningLetter[] = [];
  const notes = [...state.notifications];

  for (const type of needed) {
    if (existing.has(type)) continue;
    const id = `warn-${student.id}-${type}-${Date.now()}`;
    const letter: WarningLetter = {
      id,
      studentId: student.id,
      type,
      issuedAt: nowIso(),
      triggerDays: counted,
      limitDays: student.form === 6 ? 4.5 : 9,
      status: "issued",
    };
    fresh.push(letter);
    const isOver = type === "over_limit";
    notes.unshift({
      id: `nt-${id}`,
      createdAt: nowIso(),
      title: isOver
        ? `缺席已達／超過上限：${student.name}（${classLabel(student.className)}）`
        : `缺席預警：${student.name}（${classLabel(student.className)}）`,
      body: isOver
        ? `計入缺席 ${counted} 天，已自動發出警告信，請${actorName}跟進。`
        : `計入缺席已達 ${counted} 天（上限一半），已發出警告信。`,
      kind: "warning",
      studentId: student.id,
      warningId: id,
      read: false,
    });
  }

  if (fresh.length === 0) return { ...state, notifications: notes };

  return {
    ...state,
    warnings: [...fresh, ...state.warnings],
    notifications: notes,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribe,
    getReadySnapshot,
    getReadyServerSnapshot
  );

  useEffect(() => {
    void hydrateFromStorage();
  }, []);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  const visibleStudents = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "office") return state.students;
    return state.students.filter(
      (student) => student.className === state.selectedClassName
    );
  }, [currentUser, state.selectedClassName, state.students]);

  const login = useCallback((userId: string) => {
    patch((prev) => ({
      ...prev,
      currentUserId: userId,
      selectedClassName: userId === "u-office" ? null : prev.selectedClassName,
    }));
  }, []);

  const logout = useCallback(() => {
    patch((prev) => ({ ...prev, currentUserId: null, selectedClassName: null }));
  }, []);

  const selectClass = useCallback((className: string | null) => {
    patch((prev) => ({ ...prev, selectedClassName: className }));
  }, []);

  const setDayAttendance = useCallback(
    (studentId: string, date: string, status: DayAttendance) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以編輯出勤。");
        return;
      }

      const existingNow = memory.absences.find(
        (item) => item.studentId === studentId && item.date === date
      );
      const currentStatus = existingNow?.eclassStatus ?? "present";
      if (currentStatus === status) return;

      patch((prev) => {
        const student = prev.students.find((item) => item.id === studentId);
        if (!student) return prev;

        const existing = prev.absences.find(
          (item) => item.studentId === studentId && item.date === date
        );

        let nextAbsences = prev.absences;

        if (status === "present") {
          nextAbsences = prev.absences.filter(
            (item) => !(item.studentId === studentId && item.date === date)
          );
        } else {
          const nextRecord: AbsenceRecord = existing
            ? {
                ...existing,
                eclassStatus: status,
                reason: status === "absent" ? "缺席" : "事假",
                reviewStatus: "pending",
                documentType: "none",
                documentSubmitted: false,
                reviewedBy: currentUser.id,
                reviewedAt: nowIso(),
                source: "office",
                notes: "校務處於學生出勤頁更新當日狀態",
              }
            : {
                id: `ab-office-${studentId}-${date}-${Date.now()}`,
                studentId,
                date,
                days: 1,
                eclassStatus: status,
                reason: status === "absent" ? "缺席" : "事假",
                documentType: "none",
                documentSubmitted: false,
                reviewStatus: "pending",
                reviewedBy: currentUser.id,
                reviewedAt: nowIso(),
                notes: "校務處於學生出勤頁登記",
                source: "office",
              };

          nextAbsences = existing
            ? prev.absences.map((item) =>
                item.id === existing.id ? nextRecord : item
              )
            : [nextRecord, ...prev.absences];
        }

        return applyWarnings({ ...prev, absences: nextAbsences }, student, "校務處");
      });

      const labels = { present: "出席", absent: "缺席", leave: "事假" };
      toast.success(`已將當日狀態改為${labels[status]}。`);
    },
    [currentUser]
  );

  const updateAbsenceDetails = useCallback(
    (id: string, input: { reason: string; calledBy: string; calledAt: string }) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以更新請假資料。");
        return;
      }
      patch((prev) => ({
        ...prev,
        absences: prev.absences.map((item) =>
          item.id === id
            ? {
                ...item,
                reason: input.reason.trim() || item.reason,
                calledBy: input.calledBy.trim() || undefined,
                calledAt: input.calledAt.trim() || undefined,
              }
            : item
        ),
      }));
    },
    [currentUser]
  );

  const reviewAbsence = useCallback(
    (id: string, input: ReviewInput) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以審核缺席紀錄。");
        return;
      }
      patch((prev) => {
        const current = prev.absences.find((item) => item.id === id);
        if (!current) return prev;
        const nextAbsences = prev.absences.map((item) =>
          item.id === id
            ? {
                ...item,
                documentType: input.documentType,
                documentSubmitted: input.documentSubmitted,
                reviewStatus: input.reviewStatus,
                days: input.days,
                reason: input.reason,
                calledBy: input.calledBy.trim() || undefined,
                calledAt: input.calledAt.trim() || undefined,
                notes: input.notes.trim() || undefined,
                reviewedBy: currentUser.id,
                reviewedAt: nowIso(),
              }
            : item
        );
        const student = prev.students.find((item) => item.id === current.studentId);
        if (!student) return { ...prev, absences: nextAbsences };
        return applyWarnings(
          { ...prev, absences: nextAbsences },
          student,
          "校務處"
        );
      });
      toast.success("已更新缺席審核。");
    },
    [currentUser]
  );

  const followUpWarning = useCallback(
    (id: string, input: FollowUpInput) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以登記跟進。");
        return;
      }
      patch((prev) => ({
        ...prev,
        warnings: prev.warnings.map((item) =>
          item.id === id
            ? {
                ...item,
                status: input.archive ? "archived" : "followed_up",
                followedUpBy: currentUser.id,
                followedUpAt: nowIso(),
                followUpNotes: input.notes.trim(),
              }
            : item
        ),
      }));
      toast.success("已登記警告信跟進。");
    },
    [currentUser]
  );

  const markNotificationRead = useCallback((id: string) => {
    patch((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    patch((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
    }));
  }, []);

  const simulateSync = useCallback(() => {
    if (!currentUser || currentUser.role !== "office") {
      toast.error("只有校務處職員可以執行 eClass 同步。");
      return;
    }

    if (memory.syncLogs.some((item) => item.schoolDay === "2026-06-16")) {
      toast.message("2026-06-16 的點名已同步，沒有新紀錄。");
      return;
    }

    const newAbsences: AbsenceRecord[] = [
      {
        id: `ab-sync-${Date.now()}-1`,
        studentId: "s1a01",
        date: "2026-06-16",
        days: 1,
        eclassStatus: "absent",
        reason: "無故缺席（eClass 點名）",
        documentType: "none",
        documentSubmitted: false,
        reviewStatus: "pending",
        source: "eclass",
      },
      {
        id: `ab-sync-${Date.now()}-2`,
        studentId: "s5a01",
        date: "2026-06-16",
        days: 1,
        eclassStatus: "leave",
        reason: "請假（eClass 點名）",
        documentType: "none",
        documentSubmitted: false,
        reviewStatus: "pending",
        source: "eclass",
      },
    ];

    patch((prev) => {
      let next: AppState = {
        ...prev,
        absences: [...newAbsences, ...prev.absences],
        syncLogs: [
          {
            id: `sync-${Date.now()}`,
            syncedAt: nowIso(),
            schoolDay: "2026-06-16",
            present: 25,
            absent: 1,
            leave: 1,
            note: "模擬補課日點名。老師已於 eClass 完成點名，系統自動匯入待審核紀錄。",
          },
          ...prev.syncLogs,
        ],
        notifications: [
          {
            id: `nt-sync-${Date.now()}`,
            createdAt: nowIso(),
            title: "eClass 點名已同步",
            body: "已匯入 2026-06-16 上課日點名：出席 25、缺席 1、請假 1。請校務處核對文件。",
            kind: "sync",
            read: false,
          },
          ...prev.notifications,
        ],
      };

      for (const record of newAbsences) {
        const student = next.students.find((item) => item.id === record.studentId);
        if (student) next = applyWarnings(next, student, "校務處");
      }
      return next;
    });

    toast.success("已從 eClass 同步 2026-06-16 點名。");
  }, [currentUser]);

  const saveDigestSettings = useCallback((settings: Partial<DigestSettings>) => {
    patch((prev) => ({
      ...prev,
      digestSettings: { ...prev.digestSettings, ...settings },
    }));
  }, []);

  const upsertRecipient = useCallback((recipient: DigestRecipient) => {
    patch((prev) => {
      const exists = prev.digestRecipients.some((item) => item.id === recipient.id);
      return {
        ...prev,
        digestRecipients: exists
          ? prev.digestRecipients.map((item) =>
              item.id === recipient.id ? recipient : item
            )
          : [...prev.digestRecipients, recipient],
      };
    });
  }, []);

  const removeRecipient = useCallback((id: string) => {
    patch((prev) => ({
      ...prev,
      digestRecipients: prev.digestRecipients.filter((item) => item.id !== id),
    }));
  }, []);

  const recordDigestSend = useCallback((log: Omit<DigestLog, "id" | "createdAt">) => {
    const createdAt = nowIso();
    patch((prev) => ({
      ...prev,
      digestLogs: [
        {
          ...log,
          id: `dg-${Date.now()}`,
          createdAt,
        },
        ...prev.digestLogs,
      ],
      digestSettings: {
        ...prev.digestSettings,
        lastSentOn: hongKongToday(),
        lastSentSchoolDay: log.schoolDay,
      },
      notifications: [
        {
          id: `nt-dg-${Date.now()}`,
          createdAt,
          title: "每日缺席名單已寄出",
          body: `已將 ${log.schoolDay} 全校各班缺席 Excel 發送至 ${log.recipientEmails.length} 位指定收件人。`,
          kind: "digest",
          read: false,
        },
        ...prev.notifications,
      ],
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const seed = createSeed();
    seed.currentUserId = memory.currentUserId;
    seed.selectedClassName = memory.selectedClassName;
    assign(seed);
    toast.success("已還原示範數據。");
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      state,
      currentUser,
      visibleStudents,
      login,
      logout,
      selectClass,
      reviewAbsence,
      setDayAttendance,
      updateAbsenceDetails,
      followUpWarning,
      markNotificationRead,
      markAllNotificationsRead,
      simulateSync,
      resetDemo,
      saveDigestSettings,
      upsertRecipient,
      removeRecipient,
      recordDigestSend,
    }),
    [
      ready,
      state,
      currentUser,
      visibleStudents,
      login,
      logout,
      selectClass,
      reviewAbsence,
      setDayAttendance,
      updateAbsenceDetails,
      followUpWarning,
      markNotificationRead,
      markAllNotificationsRead,
      simulateSync,
      resetDemo,
      saveDigestSettings,
      upsertRecipient,
      removeRecipient,
      recordDigestSend,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
