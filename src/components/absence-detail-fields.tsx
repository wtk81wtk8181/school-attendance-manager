"use client";

import type { ReactNode } from "react";
import { TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ABSENCE_REASONS,
  CALLER_RELATIONS,
  CONTACT_METHODS,
  SICK_SYMPTOM_OTHER,
  SICK_SYMPTOMS,
  inferContactMethod,
  joinCaller,
  joinReason,
  joinSickSymptom,
  splitCaller,
  splitReason,
  splitSickSymptom,
} from "@/lib/absence-options";
import type { ContactMethod, DocumentType, EclassStatus } from "@/lib/types";

export type AbsenceDetailPatch = {
  reason: string;
  calledBy: string;
  calledAt: string;
  contactMethod: ContactMethod;
  contactedOn: string;
  documentType?: DocumentType;
  documentSubmitted?: boolean;
};

export function AbsenceDetailFields({
  reason,
  calledBy,
  calledAt,
  contactMethod,
  contactedOn,
  recordDate,
  eclassStatus,
  documentType = "none",
  documentSubmitted = false,
  disabled,
  compact,
  asCells,
  labels,
  onChange,
}: {
  reason: string;
  calledBy: string;
  calledAt: string;
  contactMethod?: ContactMethod;
  contactedOn?: string;
  recordDate?: string;
  eclassStatus?: EclassStatus;
  documentType?: DocumentType;
  documentSubmitted?: boolean;
  disabled?: boolean;
  compact?: boolean;
  asCells?: boolean;
  labels?: boolean;
  onChange: (next: AbsenceDetailPatch) => void;
}) {
  const reasonParts = splitReason(reason);
  const sickParts = splitSickSymptom(reasonParts.extra);
  const callerParts = splitCaller(calledBy);
  const method = inferContactMethod(calledBy, contactMethod);
  const stack = compact ? "space-y-1.5 min-w-40" : "grid gap-1.5";
  const showPerson = method !== "none";
  const showTime = method === "call" || method === "app";
  const showDate = method === "app";
  const appDate = contactedOn?.trim() || recordDate || "";
  const lateExempted = documentType === "doctor" && documentSubmitted;

  const wrap = (node: ReactNode) =>
    asCells ? <TableCell className="whitespace-normal align-top">{node}</TableCell> : node;

  function emit(next: Partial<AbsenceDetailPatch>) {
    onChange({
      reason,
      calledBy,
      calledAt,
      contactMethod: method,
      contactedOn: appDate,
      documentType,
      documentSubmitted,
      ...next,
    });
  }

  return (
    <>
      {wrap(
      <div className={stack}>
        {labels ? (
          <p className="text-[11px] text-muted-foreground">請假／缺席原因</p>
        ) : null}
        <Select
          value={reasonParts.option}
          disabled={disabled}
          onValueChange={(value) => {
            if (!value) return;
            emit({ reason: joinReason(value, value === reasonParts.option ? reasonParts.extra : "") });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="請假原因" />
          </SelectTrigger>
          <SelectContent>
            {ABSENCE_REASONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {reasonParts.option === "病假" ? (
          <>
            <Select
              value={sickParts.symptom}
              disabled={disabled}
              onValueChange={(value) => {
                if (!value) return;
                emit({
                  reason: joinReason(
                    "病假",
                    joinSickSymptom(value, value === sickParts.symptom ? sickParts.custom : "")
                  ),
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="病症" />
              </SelectTrigger>
              <SelectContent>
                {SICK_SYMPTOMS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
                <SelectItem value={SICK_SYMPTOM_OTHER}>其他</SelectItem>
              </SelectContent>
            </Select>
            {sickParts.symptom === SICK_SYMPTOM_OTHER ? (
              <Input
                disabled={disabled}
                value={sickParts.custom}
                placeholder="請填寫其他病症"
                onChange={(event) =>
                  emit({
                    reason: joinReason(
                      "病假",
                      joinSickSymptom(SICK_SYMPTOM_OTHER, event.target.value)
                    ),
                  })
                }
              />
            ) : null}
          </>
        ) : null}
        {reasonParts.option === "其他" ? (
          <Input
            disabled={disabled}
            value={reasonParts.extra}
            placeholder="請填寫其他原因"
            onChange={(event) =>
              emit({ reason: joinReason("其他", event.target.value) })
            }
          />
        ) : null}
        {eclassStatus === "late" ? (
          <label className="flex items-start gap-2 text-[11px] leading-snug text-slate-600">
            <Checkbox
              className="mt-0.5"
              disabled={disabled}
              checked={lateExempted}
              onCheckedChange={(checked) =>
                emit({
                  documentType: checked === true ? "doctor" : "none",
                  documentSubmitted: checked === true,
                })
              }
            />
            <span>
              已交醫生證明（記錄遲到，但不計入違規次數）
            </span>
          </label>
        ) : null}
      </div>
      )}

      {wrap(
      <div className={stack}>
        {labels ? (
          <p className="text-[11px] text-muted-foreground">致電人士／聯絡方式</p>
        ) : null}
        <div className="flex min-w-56 items-start gap-1.5">
          <Select
            value={
              callerParts.relation === "尚未致電" && method !== "none"
                ? "母親"
                : callerParts.relation
            }
            disabled={disabled}
            onValueChange={(value) => {
              if (!value) return;
              if (value === "尚未致電") {
                emit({ calledBy: "", contactMethod: "none", calledAt: "", contactedOn: "" });
                return;
              }
              emit({
                calledBy: joinCaller(value, value === "其他" ? "" : callerParts.name),
                contactMethod: method === "none" ? "call" : method,
              });
            }}
          >
            <SelectTrigger className="min-w-24 flex-1">
              <SelectValue placeholder="致電人士" />
            </SelectTrigger>
            <SelectContent>
              {CALLER_RELATIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={method}
            disabled={disabled}
            onValueChange={(value) => {
              if (!value) return;
              const nextMethod = value as ContactMethod;
              emit({
                contactMethod: nextMethod,
                calledBy:
                  nextMethod === "none"
                    ? ""
                    : joinCaller(
                        callerParts.relation === "尚未致電" ? "母親" : callerParts.relation,
                        callerParts.name
                      ),
                calledAt: nextMethod === "none" ? "" : calledAt,
                contactedOn:
                  nextMethod === "app" ? contactedOn?.trim() || recordDate || "" : "",
              });
            }}
          >
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue placeholder="聯絡方式" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_METHODS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showPerson && callerParts.relation === "其他" ? (
          <Input
            disabled={disabled}
            value={callerParts.name}
            placeholder="例如：姐姐、鄰居、監護人"
            onChange={(event) =>
              emit({ calledBy: joinCaller("其他", event.target.value) })
            }
          />
        ) : showPerson && callerParts.relation !== "尚未致電" ? (
          <Input
            disabled={disabled}
            value={callerParts.name}
            placeholder="姓氏（可選，如陳太）"
            onChange={(event) =>
              emit({
                calledBy: joinCaller(callerParts.relation, event.target.value),
              })
            }
          />
        ) : null}
      </div>
      )}

      {wrap(
      <div className={stack}>
        {labels ? (
          <p className="text-[11px] text-muted-foreground">
            {method === "app" ? "APP申請日期／時間" : "致電時間"}
          </p>
        ) : null}
        {showDate ? (
          <Input
            type="date"
            disabled={disabled}
            value={appDate}
            onChange={(event) => emit({ contactedOn: event.target.value })}
          />
        ) : null}
        <Input
          type="time"
          disabled={disabled || !showTime}
          value={showTime ? calledAt : ""}
          className={compact ? "w-32" : undefined}
          onChange={(event) => emit({ calledAt: event.target.value })}
        />
      </div>
      )}
    </>
  );
}
