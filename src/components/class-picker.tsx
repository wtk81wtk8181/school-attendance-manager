"use client";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/page-shell";
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
    <PageShell className="max-w-4xl">
      <PageHeader
        title="選擇班別"
        description="全校中一至中六，每級 A 至 E 共 30 班。請選班後檢閱該班出勤（唯讀）。"
      />
      {FORMS.map((form) => (
        <section key={form} className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {formLabel(form)}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CLASS_STREAMS.map((stream) => {
              const className = `${form}${stream}`;
              const count = roster.filter((item) => item.className === className).length;
              return (
                <Button
                  key={className}
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 border-slate-200 px-3 py-3 whitespace-normal transition-all duration-200 hover:border-slate-300 hover:bg-white"
                  onClick={() => selectClass(className)}
                >
                  <span className="text-base font-semibold text-slate-900">
                    {classLabel(className)}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {CLASS_TEACHERS[className]}　{count} 人
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
