"use client";

import { Button } from "@/components/ui/button";
import { classLabel, formLabel } from "@/lib/rules";
import { visibleRosterStudents } from "@/lib/hidden-students";
import { CLASS_STREAMS, CLASS_TEACHERS, FORMS } from "@/lib/roster";
import { useStore } from "@/lib/store";

export function ClassPicker() {
  const { state, selectClass } = useStore();
  const roster = visibleRosterStudents(
    state.students,
    state.hiddenStudents,
    state.hiddenStudentRemovals
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">選擇班別</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全校中一至中六，每級 A 至 E 共 30 班。請選班後檢閱該班出勤（唯讀）。
        </p>
      </div>
      {FORMS.map((form) => (
        <section key={form} className="space-y-2">
          <h2 className="text-sm font-medium text-[var(--school-navy)]">{formLabel(form)}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CLASS_STREAMS.map((stream) => {
              const className = `${form}${stream}`;
              const count = roster.filter((item) => item.className === className).length;
              return (
                <Button
                  key={className}
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 px-3 py-3 whitespace-normal"
                  onClick={() => selectClass(className)}
                >
                  <span className="text-base font-semibold">{classLabel(className)}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {CLASS_TEACHERS[className]}　{count} 人
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
