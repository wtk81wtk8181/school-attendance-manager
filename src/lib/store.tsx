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
  mergeSharedStates,
  mergeDigestRecipient,
  needsOperationalDataReset,
  readSession,
  sharedFromState,
  writeSession,
} from "@/lib/db-client";
import { emptyStaffDaily, staffDailyFor, withToggledStaff } from "@/lib/staff";
import { studentLeaveCategoryLabel } from "@/lib/student-leave";
import type {
  AbsenceRecord,
  AppState,
  AuditLog,
  DigestLog,
  DigestRecipient,
  DayAttendance,
  DigestSettings,
  DocumentType,
  ReviewStatus,
  StaffAbsenceKind,
  StaffLeaveCategory,
  StudentLeaveCategory,
  Student,
  User,
  WarningLetter,
} from "@/lib/types";

const ADMIN_EDITABLE_SECTIONS = new Set([
  "students",
  "absences",
  "warnings",
  "notifications",
  "clearedAttendance",
  "staffMembers",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "studentLeaveRecords",
  "digestRecipients",
  "digestLogs",
]);

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
  addStaffMember: (name: string) => boolean;
  addStaffMembers: (names: string[]) => number;
  removeStaffMember: (id: string) => void;
  addStaffLeave: (input: {
    staffId: string;
    category: StaffLeaveCategory;
    startDate: string;
    endDate: string;
    note: string;
    activity: string;
  }) => boolean;
  removeStaffLeave: (id: string) => void;
  addStudentLeave: (input: {
    studentId: string;
    category: StudentLeaveCategory;
    status: "leave" | "absent";
    startDate: string;
    endDate: string;
    reason: string;
    activity: string;
  }) => boolean;
  addStudentLeaves: (input: {
    studentIds: string[];
    category: StudentLeaveCategory;
    status: "leave" | "absent";
    startDate: string;
    endDate: string;
    reason: string;
    activity: string;
  }) => { added: number; skipped: number };
  removeStudentLeave: (id: string) => void;
  toggleStaffAbsence: (
    date: string,
    kind: StaffAbsenceKind,
    staffId: string,
    selected: boolean
  ) => void;
  recordDigestSend: (log: Omit<DigestLog, "id" | "createdAt">) => void;
  adminPatchState: (input: { section: string; rows: unknown[] }) => void;
  refreshFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<boolean>;
  reconnectDatabase: () => Promise<void>;
  usingDatabase: boolean;
  pendingSave: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);
const serverSnapshot = createSeed();
const listeners = new Set<() => void>();
let memory: AppState = serverSnapshot;
let hydrated = false;
let useDatabase = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let refreshing = false;
let remoteRevision = 0;
let flushInFlight: Promise<boolean> | null = null;
let dirty = false;
let saveGeneration = 0;
const pendingReplaceSections = new Set<string>();

interface StateApiPayload {
  state: AppState;
  database: boolean;
  revision?: number;
  updatedAt?: string;
  error?: string;
}

function isJsonResponse(response: Response) {
  return (response.headers.get("content-type") ?? "").includes("application/json");
}

async function fetchStatePayload(
  init: RequestInit = {}
): Promise<StateApiPayload> {
  const { headers: initHeaders, ...rest } = init;
  const response = await fetch("/api/state", {
    cache: "no-store",
    credentials: "same-origin",
    ...rest,
    headers: {
      Accept: "application/json",
      ...(initHeaders ?? {}),
    },
  });
  if (!isJsonResponse(response)) {
    throw new Error("auth");
  }
  const data = (await response.json()) as StateApiPayload;
  if (!response.ok) {
    throw new Error(data.error || "http");
  }
  return data;
}

function applyServerState(serverState: AppState, localOverlay?: AppState) {
  const session = readSession();
  let next = mergeSharedState(serverState);
  if (localOverlay) {
    next = mergeSharedStates(next, localOverlay);
  }
  memory = {
    ...next,
    currentUserId: session.currentUserId ?? memory.currentUserId,
    selectedClassName: session.selectedClassName ?? memory.selectedClassName,
  };
  emit();
}

function clearStaleLocalCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function persistSession(state: AppState) {
  writeSession(state);
}

function persistLocal(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function flushPersist(): Promise<boolean> {
  if (!useDatabase || !hydrated) return !dirty;
  if (!dirty) return true;
  if (flushInFlight) return flushInFlight;

  const generation = saveGeneration;
  const payload = sharedFromState(memory);
  const replaceSections = [...pendingReplaceSections];
  flushInFlight = (async () => {
    let retryAfterFlight = false;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      const data = await fetchStatePayload({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: payload,
          baseRevision: remoteRevision,
          replaceSections,
        }),
      });
      if (typeof data.revision === "number" || typeof data.revision === "string") {
        remoteRevision = Number(data.revision);
      }
      if (data.state) {
        if (saveGeneration === generation) {
          applyServerState(data.state);
          dirty = false;
          for (const section of replaceSections) pendingReplaceSections.delete(section);
          emit();
        } else {
          applyServerState(data.state, memory);
          retryAfterFlight = true;
        }
      } else if (saveGeneration === generation) {
        dirty = false;
        emit();
      }
      clearStaleLocalCache();
      return true;
    } catch (error) {
      const auth = error instanceof Error && error.message === "auth";
      const conflict =
        error instanceof Error && error.message.includes("資料已由其他使用者更新");
      if (conflict) {
        try {
          const latest = await fetchStatePayload({ method: "GET" });
          remoteRevision = Number(latest.revision ?? remoteRevision);
          if (latest.state) {
            for (const section of replaceSections) pendingReplaceSections.delete(section);
            dirty = false;
            applyServerState(latest.state);
          }
        } catch {
          toast.error("資料同步衝突，而且暫時無法載入最新資料。");
          return false;
        }
        toast.error("資料已由其他使用者更新；本次修改未儲存，已載入最新資料。");
        return false;
      }
      toast.error(auth ? "尚未通過網站密碼，無法寫入資料庫。" : "無法同步至資料庫，資料暫存於本機。");
      persistLocal(memory);
      return false;
    } finally {
      flushInFlight = null;
      // A second edit can arrive while the first request is still in flight.
      // Its debounce timer may have joined that old promise, so explicitly
      // schedule another flush whenever a newer generation remains dirty.
      if (retryAfterFlight && dirty && useDatabase && hydrated && !persistTimer) {
        persistTimer = setTimeout(() => {
          persistTimer = null;
          void flushPersist();
        }, 0);
      }
    }
  })();

  return flushInFlight;
}

function persistShared(state: AppState) {
  persistSession(state);
  if (!useDatabase) {
    persistLocal(state);
    return;
  }
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void flushPersist();
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

function getDirtySnapshot() {
  return dirty;
}

function getDirtyServerSnapshot() {
  return false;
}

function assign(next: AppState, mode: "shared" | "session" = "shared") {
  memory = next;
  if (mode === "session") {
    persistSession(memory);
    emit();
    return;
  }
  dirty = true;
  saveGeneration += 1;
  if (hydrated) persistShared(memory);
  emit();
}

function patch(updater: (prev: AppState) => AppState, mode: "shared" | "session" = "shared") {
  assign(updater(memory), mode);
}

async function refreshFromDatabase(force = false): Promise<boolean> {
  if (!hydrated || refreshing) return false;
  if (dirty) {
    const saved = await flushPersist();
    if (!saved) return false;
  }
  if (!useDatabase) return false;

  refreshing = true;
  try {
    const data = await fetchStatePayload({ method: "GET" });
    useDatabase = Boolean(data.database);
    if (!useDatabase) return false;

    const serverRevision = Number(data.revision ?? 0);
    if (!force && !dirty && serverRevision <= remoteRevision) return true;

    remoteRevision = serverRevision;
    if (dirty) {
      applyServerState(data.state, memory);
    } else {
      applyServerState(data.state);
    }
    clearStaleLocalCache();
    return true;
  } catch (error) {
    if (force) {
      toast.error(
        error instanceof Error && error.message === "auth"
          ? "尚未通過網站密碼，無法讀取資料庫。"
          : "無法從資料庫讀取資料。"
      );
    }
    return false;
  } finally {
    refreshing = false;
  }
}

async function hydrateFromStorage() {
  const session = readSession();
  const hadDirty = dirty;
  const local = memory;
  try {
    const data = await fetchStatePayload({ method: "GET" });
    useDatabase = Boolean(data.database);
    if (useDatabase) {
      remoteRevision = Number(data.revision ?? 0);
      if (hadDirty) {
        memory = {
          ...mergeSharedStates(mergeSharedState(data.state), local),
          currentUserId: session.currentUserId ?? local.currentUserId,
          selectedClassName: session.selectedClassName ?? local.selectedClassName,
        };
        dirty = true;
      } else {
        dirty = false;
        memory = {
          ...mergeSharedState(data.state),
          currentUserId: session.currentUserId,
          selectedClassName: session.selectedClassName,
        };
      }
      clearStaleLocalCache();
    } else {
      memory = loadLocalState();
    }
  } catch {
    useDatabase = false;
    memory = hadDirty
      ? {
          ...local,
          currentUserId: session.currentUserId ?? local.currentUserId,
          selectedClassName: session.selectedClassName ?? local.selectedClassName,
        }
      : loadLocalState();
  }
  hydrated = true;
  emit();
}

export async function rehydrateStore() {
  await hydrateFromStorage();
}

function nowIso() {
  return new Date().toISOString();
}

function auditEntry(
  state: AppState,
  action: string,
  detail: string
): AuditLog {
  const actor = state.users.find((user) => user.id === state.currentUserId);
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: nowIso(),
    actorId: actor?.id ?? "system",
    actorName: actor ? `${actor.name}` : "系統",
    action,
    detail,
  };
}

function withAudit(state: AppState, action: string, detail: string): AppState {
  return {
    ...state,
    auditLogs: [auditEntry(state, action, detail), ...(state.auditLogs ?? [])].slice(0, 500),
  };
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
  const usingDatabase = useSyncExternalStore(
    subscribe,
    () => useDatabase,
    () => false
  );
  const pendingSave = useSyncExternalStore(
    subscribe,
    getDirtySnapshot,
    getDirtyServerSnapshot
  );

  useEffect(() => {
    void hydrateFromStorage();
  }, []);

  useEffect(() => {
    if (!ready || !useDatabase) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshFromDatabase();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshFromDatabase();
      }
    }, 15000);

    const onBeforeUnload = () => {
      if (!useDatabase || !dirty) return;
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      void fetch("/api/state", {
        method: "PUT",
        keepalive: true,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          state: sharedFromState(memory),
          baseRevision: remoteRevision,
        }),
      });
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [ready, usingDatabase]);

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
    }), "session");
  }, []);

  const logout = useCallback(() => {
    patch((prev) => ({ ...prev, currentUserId: null, selectedClassName: null }), "session");
  }, []);

  const selectClass = useCallback((className: string | null) => {
    patch((prev) => ({ ...prev, selectedClassName: className }), "session");
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
          const clear = {
            studentId,
            date,
            clearedAt: nowIso(),
          };
          const clearedAttendance = [
            clear,
            ...(prev.clearedAttendance ?? []).filter(
              (item) => !(item.studentId === studentId && item.date === date)
            ),
          ];
          return withAudit(
            applyWarnings(
              { ...prev, absences: nextAbsences, clearedAttendance },
              student,
              "校務處"
            ),
            "標記出席",
            `${student.name}（${classLabel(student.className)}）${date}`
          );
        } else {
          const defaultReason =
            status === "absent" ? "缺席" : status === "late" ? "遲到" : "事假";
          const nextRecord: AbsenceRecord = existing
            ? {
                ...existing,
                eclassStatus: status,
                reason:
                  !existing.reason || ["缺席", "遲到", "事假"].includes(existing.reason)
                    ? defaultReason
                    : existing.reason,
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

        return withAudit(
          applyWarnings(
            {
              ...prev,
              absences: nextAbsences,
              clearedAttendance: (prev.clearedAttendance ?? []).filter(
                (item) => !(item.studentId === studentId && item.date === date)
              ),
            },
            student,
            "校務處"
          ),
          existing ? "更新學生當日狀態" : "登記學生缺席／遲到／事假",
          `${student.name}（${classLabel(student.className)}）${date} → ${status === "absent" ? "缺席" : status === "late" ? "遲到" : "事假"}`
        );
      });

      const labels = {
        present: "出席",
        absent: "缺席",
        late: "遲到",
        leave: "事假",
      };
      toast.success(`已標記為${labels[status]}。請按「確定儲存」寫入資料庫。`);
    },
    [currentUser]
  );

  const updateAbsenceDetails = useCallback(
    (id: string, input: { reason: string; calledBy: string; calledAt: string }) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以更新請假資料。");
        return;
      }
      patch((prev) => {
        const current = prev.absences.find((item) => item.id === id);
        if (!current) return prev;
        const student = prev.students.find((item) => item.id === current.studentId);
        return withAudit(
          {
            ...prev,
            absences: prev.absences.map((item) =>
              item.id === id
                ? {
                    ...item,
                    reason: input.reason.trim() || item.reason,
                    calledBy: input.calledBy.trim() || undefined,
                    calledAt: input.calledAt.trim() || undefined,
                    reviewedBy: currentUser.id,
                    reviewedAt: nowIso(),
                  }
                : item
            ),
          },
          "更新缺席資料",
          `${student?.name ?? current.studentId}　${current.date}`
        );
      });
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
        return withAudit(
          applyWarnings(
            { ...prev, absences: nextAbsences },
            student,
            "校務處"
          ),
          "審核缺席紀錄",
          `${student.name}（${classLabel(student.className)}）${current.date} → ${input.reviewStatus === "approved" ? "通過" : input.reviewStatus === "rejected" ? "不通過" : "待審"}`
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
      patch((prev) => {
        const current = prev.warnings.find((item) => item.id === id);
        if (!current) return prev;
        const student = prev.students.find((item) => item.id === current.studentId);
        return withAudit(
          {
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
          },
          input.archive ? "封存警告信" : "登記警告信跟進",
          student?.name ?? current.studentId
        );
      });
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
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以修改每日電郵設定。");
      return;
    }
    patch((prev) =>
      withAudit(
        {
          ...prev,
          digestSettings: {
            ...prev.digestSettings,
            ...settings,
            updatedAt: nowIso(),
          },
        },
        "更新每日電郵設定",
        settings.enabled === undefined
          ? `發送時間：${settings.sendTime ?? prev.digestSettings.sendTime}`
          : settings.enabled
            ? "已啟用自動發送"
            : "已停用自動發送"
      )
    );
  }, [currentUser]);

  const upsertRecipient = useCallback((recipient: DigestRecipient) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以修改電郵收件人。");
      return;
    }
    patch((prev) => {
      const next = { ...recipient, updatedAt: nowIso() };
      return withAudit(
        {
          ...prev,
          digestRecipients: mergeDigestRecipient(prev.digestRecipients, next),
          removedRecipients: (prev.removedRecipients ?? []).filter(
            (item) => item.email.toLowerCase() !== next.email.trim().toLowerCase()
          ),
        },
        "新增／更新電郵收件人",
        `${next.name} <${next.email}>`
      );
    });
  }, [currentUser]);

  const removeRecipient = useCallback((id: string) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以刪除電郵收件人。");
      return;
    }
    patch((prev) => {
      const current = prev.digestRecipients.find((item) => item.id === id);
      if (!current) return prev;
      return withAudit(
        {
          ...prev,
          digestRecipients: prev.digestRecipients.filter((item) => item.id !== id),
          removedRecipients: [
            {
              id: current.id,
              email: current.email,
              removedAt: nowIso(),
            },
            ...(prev.removedRecipients ?? []).filter(
              (item) =>
                item.id !== current.id &&
                item.email.toLowerCase() !== current.email.toLowerCase()
            ),
          ],
        },
        "刪除電郵收件人",
        `${current.name} <${current.email}>`
      );
    });
    toast.success("已移除收件人。");
  }, [currentUser]);

  const addStaffMember = useCallback((name: string) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以修改教職員名單。");
      return false;
    }
    const trimmed = name.trim();
    if (!trimmed) return false;
    let added = false;
    patch((prev) => {
      const members = prev.staffMembers ?? [];
      if (members.some((item) => item.name === trimmed)) return prev;
      added = true;
      return withAudit(
        {
          ...prev,
          staffMembers: [
            ...members,
            {
              id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: trimmed,
              updatedAt: nowIso(),
            },
          ],
        },
        "新增教職員",
        trimmed
      );
    });
    return added;
  }, [currentUser]);

  const addStaffMembers = useCallback((names: string[]) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以批量匯入教職員。");
      return 0;
    }
    const cleaned = [...new Set(names.map((item) => item.trim()).filter(Boolean))];
    if (cleaned.length === 0) return 0;
    let added = 0;
    patch((prev) => {
      const members = prev.staffMembers ?? [];
      const existing = new Set(members.map((item) => item.name));
      const fresh = cleaned.filter((name) => !existing.has(name));
      added = fresh.length;
      if (fresh.length === 0) return prev;
      const now = nowIso();
      return withAudit(
        {
          ...prev,
          staffMembers: [
            ...members,
            ...fresh.map((name, index) => ({
              id: `staff-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
              name,
              updatedAt: now,
            })),
          ],
        },
        "批量匯入教職員",
        `新增 ${fresh.length} 人：${fresh.slice(0, 8).join("、")}${fresh.length > 8 ? "…" : ""}`
      );
    });
    return added;
  }, [currentUser]);

  const removeStaffMember = useCallback((id: string) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以刪除教職員。");
      return;
    }
    patch((prev) => {
      const current = (prev.staffMembers ?? []).find((item) => item.id === id);
      if (!current) return prev;
      const removedAt = nowIso();
      const strip = (ids: string[]) => ids.filter((item) => item !== id);
      const removedLeaves = (prev.staffLeaveRecords ?? []).filter(
        (item) => item.staffId === id
      );
      return withAudit(
        {
          ...prev,
          staffMembers: (prev.staffMembers ?? []).filter((item) => item.id !== id),
          staffRemovals: [
            { id, removedAt },
            ...(prev.staffRemovals ?? []).filter((item) => item.id !== id),
          ],
          staffDailyAbsences: (prev.staffDailyAbsences ?? []).map((item) => ({
            ...item,
            sickIds: strip(item.sickIds),
            personalIds: strip(item.personalIds),
            officialIds: strip(item.officialIds),
            earlyIds: strip(item.earlyIds),
            selectionChanges: Object.fromEntries(
              Object.entries(item.selectionChanges ?? {}).filter(
                ([staffId]) => staffId !== id
              )
            ),
          })),
          staffLeaveRecords: (prev.staffLeaveRecords ?? []).filter(
            (item) => item.staffId !== id
          ),
          staffLeaveRemovals: [
            ...removedLeaves.map((item) => ({ id: item.id, removedAt })),
            ...(prev.staffLeaveRemovals ?? []).filter(
              (removal) => !removedLeaves.some((leave) => leave.id === removal.id)
            ),
          ],
        },
        "刪除教職員",
        current.name
      );
    });
  }, [currentUser]);

  const addStaffLeave = useCallback(
    (input: {
      staffId: string;
      category: StaffLeaveCategory;
      startDate: string;
      endDate: string;
      note: string;
      activity: string;
    }) => {
      if (currentUser?.role !== "office") {
        toast.error("只有校務處職員可以登記教職員請假。");
        return false;
      }
      if (!input.staffId || !input.startDate) return false;
      let added = false;
      let overlapping = false;
      patch((prev) => {
        const member = (prev.staffMembers ?? []).find((item) => item.id === input.staffId);
        if (!member) return prev;
        const now = nowIso();
        const endDate =
          input.endDate && input.endDate >= input.startDate
            ? input.endDate
            : input.startDate;
        overlapping = (prev.staffLeaveRecords ?? []).some(
          (item) =>
            item.staffId === input.staffId &&
            item.startDate <= endDate &&
            item.endDate >= input.startDate
        );
        if (overlapping) return prev;
        added = true;
        const record = {
          id: `sleave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          staffId: member.id,
          staffName: member.name,
          category: input.category,
          startDate: input.startDate,
          endDate,
          note: input.note.trim(),
          activity: input.activity.trim(),
          createdBy: prev.currentUserId ?? "",
          createdAt: now,
          updatedAt: now,
        };
        return withAudit(
          {
            ...prev,
            staffLeaveRecords: [record, ...(prev.staffLeaveRecords ?? [])],
          },
          "提早登記教職員請假",
          `${member.name}　${input.startDate}${endDate !== input.startDate ? ` 至 ${endDate}` : ""}`
        );
      });
      if (overlapping) {
        toast.error("這位教職員在所選日期已有請假紀錄。");
      }
      return added;
    },
    [currentUser]
  );

  const removeStaffLeave = useCallback((id: string) => {
    if (currentUser?.role !== "office") {
      toast.error("只有校務處職員可以取消教職員請假。");
      return;
    }
    patch((prev) => {
      const current = (prev.staffLeaveRecords ?? []).find((item) => item.id === id);
      if (!current) return prev;
      const removedAt = nowIso();
      return withAudit(
        {
          ...prev,
          staffLeaveRecords: (prev.staffLeaveRecords ?? []).filter((item) => item.id !== id),
          staffLeaveRemovals: [
            { id, removedAt },
            ...(prev.staffLeaveRemovals ?? []).filter((item) => item.id !== id),
          ],
        },
        "取消提早請假",
        `${current.staffName}　${current.startDate}`
      );
    });
  }, [currentUser]);

  const addStudentLeave = useCallback(
    (input: {
      studentId: string;
      category: StudentLeaveCategory;
      status: "leave" | "absent";
      startDate: string;
      endDate: string;
      reason: string;
      activity: string;
    }) => {
      if (currentUser?.role !== "office") {
        toast.error("只有校務處職員可以登記學生請假。");
        return false;
      }
      if (!input.studentId || !input.startDate) return false;
      let added = false;
      let overlapping = false;
      patch((prev) => {
        const student = prev.students.find((item) => item.id === input.studentId);
        if (!student) return prev;
        const now = nowIso();
        const endDate =
          input.endDate && input.endDate >= input.startDate
            ? input.endDate
            : input.startDate;
        overlapping = (prev.studentLeaveRecords ?? []).some(
          (item) =>
            item.studentId === input.studentId &&
            item.startDate <= endDate &&
            item.endDate >= input.startDate
        );
        if (overlapping) return prev;
        added = true;
        const record = {
          id: `pleave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          category: input.category,
          status: input.status,
          startDate: input.startDate,
          endDate,
          reason: input.reason.trim(),
          activity: input.activity.trim(),
          createdBy: prev.currentUserId ?? "",
          createdAt: now,
          updatedAt: now,
        };
        return withAudit(
          {
            ...prev,
            studentLeaveRecords: [record, ...(prev.studentLeaveRecords ?? [])],
          },
          "提早登記學生請假",
          `${student.name}（${student.className}）${input.startDate}${
            endDate !== input.startDate ? ` 至 ${endDate}` : ""
          }`
        );
      });
      if (overlapping) {
        toast.error("這位學生在所選日期已有預先請假紀錄。");
      }
      return added;
    },
    [currentUser]
  );

  const addStudentLeaves = useCallback(
    (input: {
      studentIds: string[];
      category: StudentLeaveCategory;
      status: "leave" | "absent";
      startDate: string;
      endDate: string;
      reason: string;
      activity: string;
    }) => {
      if (currentUser?.role !== "office") {
        toast.error("只有校務處職員可以登記學生請假。");
        return { added: 0, skipped: 0 };
      }
      const uniqueIds = [...new Set(input.studentIds.filter(Boolean))];
      if (uniqueIds.length === 0 || !input.startDate) {
        return { added: 0, skipped: 0 };
      }

      let added = 0;
      let skipped = 0;
      patch((prev) => {
        const now = nowIso();
        const endDate =
          input.endDate && input.endDate >= input.startDate
            ? input.endDate
            : input.startDate;
        const records = [...(prev.studentLeaveRecords ?? [])];
        const addedNames: string[] = [];
        const skippedNames: string[] = [];

        for (const studentId of uniqueIds) {
          const student = prev.students.find((item) => item.id === studentId);
          if (!student) continue;
          const overlapping = records.some(
            (item) =>
              item.studentId === studentId &&
              item.startDate <= endDate &&
              item.endDate >= input.startDate
          );
          if (overlapping) {
            skipped += 1;
            skippedNames.push(student.name);
            continue;
          }
          records.unshift({
            id: `pleave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            studentId: student.id,
            studentName: student.name,
            className: student.className,
            category: input.category,
            status: input.status,
            startDate: input.startDate,
            endDate,
            reason: input.reason.trim(),
            activity: input.activity.trim(),
            createdBy: prev.currentUserId ?? "",
            createdAt: now,
            updatedAt: now,
          });
          added += 1;
          addedNames.push(student.name);
        }

        if (added === 0) return prev;

        const activityLabel = input.activity.trim() || studentLeaveCategoryLabel(input.category);
        return withAudit(
          {
            ...prev,
            studentLeaveRecords: records,
          },
          "批量登記學生請假",
          `${activityLabel}　${input.startDate}${
            endDate !== input.startDate ? ` 至 ${endDate}` : ""
          }　${added} 人${skipped > 0 ? `（略過 ${skipped} 人）` : ""}：${addedNames
            .slice(0, 6)
            .join("、")}${addedNames.length > 6 ? "…" : ""}`
        );
      });

      if (added === 0 && skipped > 0) {
        toast.error("所選學生在這段日期已有預先請假紀錄。");
      } else if (skipped > 0) {
        toast.warning(`已登記 ${added} 人，${skipped} 人因日期重疊而略過。`);
      }

      return { added, skipped };
    },
    [currentUser]
  );

  const removeStudentLeave = useCallback(
    (id: string) => {
      if (currentUser?.role !== "office") {
        toast.error("只有校務處職員可以取消學生請假。");
        return;
      }
      patch((prev) => {
        const current = (prev.studentLeaveRecords ?? []).find((item) => item.id === id);
        if (!current) return prev;
        const removedAt = nowIso();
        return withAudit(
          {
            ...prev,
            studentLeaveRecords: (prev.studentLeaveRecords ?? []).filter(
              (item) => item.id !== id
            ),
            studentLeaveRemovals: [
              { id, removedAt },
              ...(prev.studentLeaveRemovals ?? []).filter((item) => item.id !== id),
            ],
          },
          "取消學生預先請假",
          `${current.studentName}　${current.startDate}`
        );
      });
      toast.success("已取消學生預先請假。");
    },
    [currentUser]
  );

  const toggleStaffAbsence = useCallback(
    (date: string, kind: StaffAbsenceKind, staffId: string, selected: boolean) => {
      if (currentUser?.role !== "office") {
        toast.error("只有校務處職員可以修改教職員缺席。");
        return;
      }
      patch((prev) => {
        const current = staffDailyFor(prev.staffDailyAbsences, date);
        const next = withToggledStaff(
          current.updatedAt ? current : emptyStaffDaily(date),
          kind,
          staffId,
          selected,
          nowIso()
        );
        const member = (prev.staffMembers ?? []).find((item) => item.id === staffId);
        return withAudit(
          {
            ...prev,
            staffDailyAbsences: [
              next,
              ...(prev.staffDailyAbsences ?? []).filter((item) => item.date !== date),
            ],
          },
          selected ? "登記教職員當日缺席" : "取消教職員當日缺席",
          `${member?.name ?? staffId}　${date}`
        );
      });
    },
    [currentUser]
  );

  const recordDigestSend = useCallback((log: Omit<DigestLog, "id" | "createdAt">) => {
    if (currentUser?.role !== "office") return;
    const createdAt = nowIso();
    patch((prev) => withAudit(
      {
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
        updatedAt: createdAt,
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
      },
      "發送每日缺席電郵",
      `${log.schoolDay} → ${log.recipientEmails.join("、")}`
    ));
  }, [currentUser]);

  const refreshFromDatabaseNow = useCallback(async () => {
    const flushed = await flushPersist();
    if (!flushed) return;
    const ok = await refreshFromDatabase(true);
    if (!ok) return;
    toast.success(
      `已從資料庫更新：${memory.students.length} 名學生、${memory.absences.length} 筆缺席紀錄。`
    );
  }, []);

  const saveToDatabase = useCallback(async () => {
    if (!useDatabase) {
      await hydrateFromStorage();
      if (!useDatabase) {
        toast.error("尚未連接資料庫。請重新輸入網站密碼後再試。");
        return false;
      }
    }
    const ok = dirty ? await flushPersist() : true;
    if (!ok) return false;
    const refreshed = await refreshFromDatabase(true);
    if (!refreshed) return false;
    toast.success(
      `已確定寫入資料庫：${memory.students.length} 名學生、${memory.absences.length} 筆缺席紀錄。`
    );
    return true;
  }, []);

  const reconnectDatabase = useCallback(async () => {
    await hydrateFromStorage();
    if (useDatabase) {
      toast.success(
        `已連接資料庫：${memory.students.length} 名學生、${memory.absences.length} 筆缺席紀錄。`
      );
    } else {
      toast.error("仍未能連接資料庫，此裝置的變更不會出現在其他電腦。");
    }
  }, []);

  const adminPatchState = useCallback(
    (input: { section: string; rows: unknown[] }) => {
      if (!currentUser || currentUser.role !== "office") {
        toast.error("只有校務處職員可以使用後台管理。");
        return;
      }
      if (!ADMIN_EDITABLE_SECTIONS.has(input.section)) {
        toast.error("此資料表不可由後台直接修改。");
        return;
      }
      const currentSection = memory[input.section as keyof AppState];
      if (!Array.isArray(currentSection)) {
        toast.error("此資料表不支援試算表方式修改。");
        return;
      }
      pendingReplaceSections.add(input.section);
      patch((prev) =>
        withAudit(
          {
            ...prev,
            [input.section]: input.rows,
          } as AppState,
          "後台管理修改",
          `${input.section}（${input.rows.length} 列）`
        )
      );
      toast.success("已更新資料，同步中……");
    },
    [currentUser]
  );

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
      addStaffMember,
      addStaffMembers,
      removeStaffMember,
      addStaffLeave,
      removeStaffLeave,
      addStudentLeave,
      addStudentLeaves,
      removeStudentLeave,
      toggleStaffAbsence,
      recordDigestSend,
      adminPatchState,
      refreshFromDatabase: refreshFromDatabaseNow,
      saveToDatabase,
      reconnectDatabase,
      usingDatabase,
      pendingSave,
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
      addStaffMember,
      addStaffMembers,
      removeStaffMember,
      addStaffLeave,
      removeStaffLeave,
      addStudentLeave,
      addStudentLeaves,
      removeStudentLeave,
      toggleStaffAbsence,
      recordDigestSend,
      adminPatchState,
      refreshFromDatabaseNow,
      saveToDatabase,
      reconnectDatabase,
      usingDatabase,
      pendingSave,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
