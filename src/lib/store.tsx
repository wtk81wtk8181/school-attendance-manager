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
import { classLabel, countedAbsenceDays, FREQUENT_LIMIT, frequentOccurrences, neededWarningTypes } from "@/lib/rules";
import { hongKongToday } from "@/lib/digest";
import { createSeed, STORAGE_KEY } from "@/lib/seed";
import {
  mergeSharedState,
  needsOperationalDataReset,
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
    const result = {
      ...merged,
      currentUserId,
      selectedClassName:
        session.selectedClassName ?? parsed.selectedClassName ?? legacyTeacher,
    };
    if (needsOperationalDataReset(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    }
    return result;
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
  const frequent = frequentOccurrences(records);
  const lateCount = records.filter(
    (item) => item.eclassStatus === "late" && item.reviewStatus !== "approved"
  ).length;
  const absentCount = frequent - lateCount;
  const needed = neededWarningTypes(counted, student.form, frequent);
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
      triggerDays: type === "frequent" ? frequent : counted,
      limitDays: type === "frequent" ? FREQUENT_LIMIT : student.form === 6 ? 4.5 : 9,
      status: "issued",
    };
    fresh.push(letter);
    const title =
      type === "over_limit"
        ? `缺席已達／超過上限：${student.name}（${classLabel(student.className)}）`
        : type === "frequent"
          ? `缺席／遲到超過 ${FREQUENT_LIMIT} 次：${student.name}（${classLabel(student.className)}）`
          : `缺席預警：${student.name}（${classLabel(student.className)}）`;
    const body =
      type === "over_limit"
        ? `計入缺席 ${counted} 天，已自動發出警告信，請${actorName}跟進。`
        : type === "frequent"
          ? `本學年缺席 ${absentCount} 次、遲到 ${lateCount} 次，合計 ${frequent} 次（超過 ${FREQUENT_LIMIT} 次上限），已自動發出警告信並電郵通知指定收件人。`
          : `計入缺席已達 ${counted} 天（上限一半），已發出警告信。`;
    notes.unshift({
      id: `nt-${id}`,
      createdAt: nowIso(),
      title,
      body,
      kind: "warning",
      studentId: student.id,
      warningId: id,
      read: false,
    });
  }

  if (fresh.length > 0) {
    void notifyWarningsByEmail(state, student, fresh, {
      counted,
      frequent,
      absentCount,
      lateCount,
    });
  }

  if (fresh.length === 0) return { ...state, notifications: notes };

  return {
    ...state,
    warnings: [...fresh, ...state.warnings],
    notifications: notes,
  };
}

/** 觸發警告時同步寄出 Email 通知指定收件人 */
async function notifyWarningsByEmail(
  state: AppState,
  student: Student,
  letters: WarningLetter[],
  stats: { counted: number; frequent: number; absentCount: number; lateCount: number }
) {
  const recipients = state.digestRecipients
    .filter((item) => item.enabled)
    .map((item) => ({ name: item.name, email: item.email }));
  if (recipients.length === 0) return;
  try {
    await fetch("/api/warning/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warnings: letters.map((letter) => ({
          type: letter.type,
          triggerDays: letter.triggerDays,
          limitDays: letter.limitDays,
        })),
        student: {
          name: student.name,
          nameEn: student.nameEn,
          className: classLabel(student.className),
          teacher: student.homeroomTeacherName,
          countedAbsenceDays: stats.counted,
          absentCount: stats.absentCount,
          lateCount: stats.lateCount,
          frequentCount: stats.frequent,
        },
        recipients,
      }),
    });
  } catch {
    // 寄信失敗不阻礙警告信流程
  }
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
          const defaultReason =
            status === "absent" ? "缺席" : status === "late" ? "遲到" : "事假";
          const nextRecord: AbsenceRecord = existing
            ? {
                ...existing,
                eclassStatus: status,
                reason: defaultReason,
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
                reason: defaultReason,
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

      const labels = {
        present: "出席",
        absent: "缺席",
        late: "遲到",
        leave: "事假",
      };
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
