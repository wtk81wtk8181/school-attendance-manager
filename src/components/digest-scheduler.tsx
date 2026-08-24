"use client";

import { useEffect } from "react";
import { hongKongHHMM, hongKongToday, resolveDigestSchoolDay } from "@/lib/digest";
import { useAbsenceDigest } from "@/hooks/use-absence-digest";
import { useStore } from "@/lib/store";

let autoSentStamp = "";
let lastHandledSyncId: string | null = null;
let schedulerPrimed = false;

export function DigestScheduler() {
  const { ready, currentUser, state } = useStore();
  const { busy, run } = useAbsenceDigest();

  useEffect(() => {
    if (!ready || currentUser?.role !== "office" || busy) return;
    if (!state.digestSettings.enabled) return;
    if (state.digestRecipients.filter((item) => item.enabled).length === 0) return;

    const latestSync = state.syncLogs[0];
    if (!schedulerPrimed) {
      lastHandledSyncId = latestSync?.id ?? null;
      schedulerPrimed = true;
    } else if (
      state.digestSettings.sendAfterSync &&
      latestSync &&
      lastHandledSyncId !== latestSync.id &&
      state.digestSettings.lastSentSchoolDay !== latestSync.schoolDay
    ) {
      lastHandledSyncId = latestSync.id;
      void run({
        schoolDay: latestSync.schoolDay,
        sendEmail: true,
        trigger: "sync",
        download: true,
      });
      return;
    } else if (latestSync) {
      lastHandledSyncId = latestSync.id;
    }

    const today = hongKongToday();
    if (state.digestSettings.lastSentOn === today) return;
    if (hongKongHHMM() < state.digestSettings.sendTime) return;
    const schoolDay = resolveDigestSchoolDay(state.absences);
    const stamp = `${today}:${schoolDay}`;
    if (autoSentStamp === stamp) return;
    autoSentStamp = stamp;
    void run({
      schoolDay,
      sendEmail: true,
      trigger: "auto",
      download: true,
    });
  }, [
    busy,
    currentUser,
    ready,
    run,
    state.absences,
    state.digestRecipients,
    state.digestSettings,
    state.syncLogs,
  ]);

  return null;
}
