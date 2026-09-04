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
import {
  ABSENCE_REASONS,
  CALLER_RELATIONS,
  CONTACT_METHODS,
  inferContactMethod,
  joinCaller,
  joinReason,
  splitCaller,
  splitReason,
} from "@/lib/absence-options";
import type { ContactMethod } from "@/lib/types";

export type AbsenceDetailPatch = {
  reason: string;
  calledBy: string;
  calledAt: string;
  contactMethod: ContactMethod;
};

export function AbsenceDetailFields({
  reason,
  calledBy,
  calledAt,
  contactMethod,
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
  disabled?: boolean;
  compact?: boolean;
  asCells?: boolean;
  labels?: boolean;
  onChange: (next: AbsenceDetailPatch) => void;
}) {
  const reasonParts = splitReason(reason);
  const callerParts = splitCaller(calledBy);
  const method = inferContactMethod(calledBy, contactMethod);
  const stack = compact ? "space-y-1.5 min-w-40" : "grid gap-1.5";
  const showPerson = method !== "none";
  const showTime = method === "call";

  const wrap = (node: ReactNode) =>
    asCells ? <TableCell className="whitespace-normal align-top">{node}</TableCell> : node;

  function emit(next: Partial<AbsenceDetailPatch>) {
    onChange({
      reason,
      calledBy,
      calledAt,
      contactMethod: method,
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
          <Input
            disabled={disabled}
            value={reasonParts.extra}
            placeholder="病症（例如：感冒、發燒）"
            onChange={(event) =>
              emit({ reason: joinReason("病假", event.target.value) })
            }
          />
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
                emit({ calledBy: "", contactMethod: "none", calledAt: "" });
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
                calledAt: nextMethod === "call" ? calledAt : "",
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
            {showTime ? "致電時間" : "聯絡時間"}
          </p>
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
