"use client";

import { useEffect } from "react";
import { hongKongHHMM, hongKongToday } from "@/lib/digest";
import { useAbsenceDigest } from "@/hooks/use-absence-digest";
import { useStore } from "@/lib/store";

let autoSentStamp = "";
let autoRetryAfter = 0;

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
    const schoolDay = today;
    const stamp = `${today}:${schoolDay}`;
    if (autoSentStamp === stamp) return;
    if (Date.now() < autoRetryAfter) return;
    autoSentStamp = stamp;
    void run({
      schoolDay,
      sendEmail: true,
      trigger: "auto",
    }).then((result) => {
      if (!result) {
        autoSentStamp = "";
        autoRetryAfter = Date.now() + 15 * 60 * 1000;
      } else {
        autoRetryAfter = 0;
      }
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
