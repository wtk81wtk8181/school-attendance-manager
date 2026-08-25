import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const apply = process.argv.includes("--apply");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error("Missing database connection string");
}

const rosterSource = fs.readFileSync(
  path.join(root, "src", "data", "roster-students.ts"),
  "utf8"
);
const rosterMarker = "export const ROSTER_STUDENTS: Student[] = ";
const markerIndex = rosterSource.indexOf(rosterMarker);
const rosterStart = markerIndex + rosterMarker.length;
const rosterEnd = rosterSource.lastIndexOf("];");
if (markerIndex < 0 || rosterEnd < rosterStart) {
  throw new Error("Unable to parse generated roster");
}
const roster = JSON.parse(rosterSource.slice(rosterStart, rosterEnd + 1));
const rosterIds = new Set(roster.map((student) => student.id));
const studentNumbers = new Set(roster.map((student) => student.studentNo));
if (
  roster.length !== rosterIds.size ||
  roster.length !== studentNumbers.size
) {
  throw new Error("Generated roster still contains duplicate identifiers");
}

const fakeRecipientEmails = new Set([
  "attendance@mkpk.edu.hk",
  "chow.kai.ming@mkpk.edu.hk",
  "lam.pui.yee@mkpk.edu.hk",
  "wong.wing.sze@mkpk.edu.hk",
  "yang.hong@mkpk.edu.hk",
  "lee.chi.keung@mkpk.edu.hk",
  "wongtszkit@mkpc.edu",
  "wong@school.edu.hk",
  "cheng@school.edu.hk",
  "cindy@school.edu.hk",
]);
const ambiguousStudentIds = new Set(["s-5b-00", "s-6b-00", "s-6d-00"]);
const now = new Date().toISOString();
const sql = neon(connectionString);

for (let attempt = 0; attempt < 4; attempt += 1) {
  const rows = await sql`
    SELECT payload, revision
    FROM app_snapshots
    WHERE id = 'default'
  `;
  if (rows.length === 0) throw new Error("Snapshot not found");

  const payload = rows[0].payload;
  const revision = Number(rows[0].revision);
  const currentStudentIds = (payload.students ?? []).map((student) => student.id);
  const currentStudentIdSet = new Set(currentStudentIds);
  const currentDuplicateStudentIds =
    currentStudentIds.length - currentStudentIdSet.size;
  const currentOrphanAbsences = (payload.absences ?? []).filter(
    (record) => !currentStudentIdSet.has(record.studentId)
  ).length;
  const recipients = (payload.digestRecipients ?? []).filter(
    (recipient) => !fakeRecipientEmails.has(recipient.email.trim().toLowerCase())
  );
  const existingRemovals = new Map(
    (payload.removedRecipients ?? []).map((removal) => [
      removal.email.trim().toLowerCase(),
      removal,
    ])
  );
  for (const email of fakeRecipientEmails) {
    if (!existingRemovals.has(email)) {
      existingRemovals.set(email, {
        id: `rcpt-${email.replace(/[^a-z0-9]+/g, "-")}`,
        email,
        removedAt: now,
      });
    }
  }

  const beforeAbsences = payload.absences ?? [];
  const absences = beforeAbsences.filter(
    (record) => !ambiguousStudentIds.has(record.studentId)
  );
  const warnings = (payload.warnings ?? []).filter(
    (warning) => !ambiguousStudentIds.has(warning.studentId)
  );
  const removedAbsences = beforeAbsences.filter((record) =>
    ambiguousStudentIds.has(record.studentId)
  );
  const clearMap = new Map(
    (payload.clearedAttendance ?? []).map((clear) => [
      `${clear.studentId}:${clear.date}`,
      clear,
    ])
  );
  for (const record of removedAbsences) {
    clearMap.set(`${record.studentId}:${record.date}`, {
      studentId: record.studentId,
      date: record.date,
      clearedAt: now,
    });
  }
  const clearedAttendance = [...clearMap.values()];
  const auditLogs = [
    {
      id: `audit-integrity-${Date.now()}`,
      at: now,
      actorId: "system",
      actorName: "系統",
      action: "修正資料完整性",
      detail: `修正重複學生 ID，移除 ${beforeAbsences.length - absences.length} 筆無法辨認的舊缺席紀錄，並清除假收件人。`,
    },
    ...(payload.auditLogs ?? []),
  ].slice(0, 500);

  const next = {
    ...payload,
    students: roster,
    absences,
    warnings,
    clearedAttendance,
    digestRecipients: recipients,
    removedRecipients: [...existingRemovals.values()],
    staffLeaveRecords: payload.staffLeaveRecords ?? [],
    staffLeaveRemovals: payload.staffLeaveRemovals ?? [],
    auditLogs,
  };

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        revision,
        rosterCount: roster.length,
        activeRecipientsBefore: (payload.digestRecipients ?? []).length,
        activeRecipientsAfter: recipients.length,
        absencesRemoved: beforeAbsences.length - absences.length,
        currentDuplicateStudentIds,
        currentOrphanAbsences,
      },
      null,
      2
    )
  );

  if (!apply) break;
  const updated = await sql`
    UPDATE app_snapshots
    SET payload = ${next},
        revision = revision + 1,
        updated_at = now()
    WHERE id = 'default' AND revision = ${revision}
    RETURNING revision
  `;
  if (updated.length > 0) {
    console.log(`Migration applied at revision ${updated[0].revision}.`);
    break;
  }
  if (attempt === 3) {
    throw new Error("Snapshot changed repeatedly; migration was not applied");
  }
}
