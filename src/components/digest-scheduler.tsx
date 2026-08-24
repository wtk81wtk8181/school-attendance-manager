"use client";

import { useEffect } from "react";
import { hongKongHHMM, hongKongToday, resolveDigestSchoolDay } from "@/lib/digest";
import { useAbsenceDigest } from "@/hooks/use-absence-digest";
import { useStore } from "@/lib/store";

let autoSentStamp = "";

export function DigestScheduler() {
  const { ready, currentUser, state } = useStore();
  const { busy, run } = useAbsenceDigest();

  useEffect(() => {
    if (!ready || currentUser?.role !== "office" || busy) return;
    if (!state.digestSettings.enabled) return;
    if (state.digestRecipients.filter((item) => item.enabled).length === 0) return;

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
    });
  }, [
    busy,
    currentUser,
    ready,
    run,
    state.absences,
    state.digestRecipients,
    state.digestSettings,
  ]);

  return null;
}
