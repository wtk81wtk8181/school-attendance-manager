import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error("Missing database connection string");
}

const sql = neon(connectionString);
const rows = await sql`
  SELECT
    payload,
    revision
  FROM app_snapshots
  WHERE id = 'default'
`;

const snapshot = rows[0];
if (!snapshot) {
  console.log(JSON.stringify(null));
  process.exit(0);
}

const payload = snapshot.payload;
const arrayNames = [
  "students",
  "absences",
  "warnings",
  "notifications",
  "digestRecipients",
  "digestLogs",
  "clearedAttendance",
  "removedRecipients",
  "staffMembers",
  "staffRemovals",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "auditLogs",
];
const counts = Object.fromEntries(
  arrayNames.map((name) => [name, Array.isArray(payload[name]) ? payload[name].length : "missing"])
);
const duplicateIds = Object.fromEntries(
  arrayNames
    .filter((name) => Array.isArray(payload[name]))
    .map((name) => {
      const ids = payload[name].map((item) => item?.id).filter(Boolean);
      return [name, ids.filter((id, index) => ids.indexOf(id) !== index)];
    })
    .filter(([, ids]) => ids.length > 0)
);
const recipients = (payload.digestRecipients ?? []).map(({ id, name, email, enabled }) => ({
  id,
  name,
  email,
  enabled,
}));
const absenceReferences = (payload.absences ?? []).map((absence) => {
  const matches = (payload.students ?? []).filter((student) => student.id === absence.studentId);
  return {
    absenceId: absence.id,
    studentId: absence.studentId,
    date: absence.date,
    matchCount: matches.length,
    students: matches.slice(0, 5).map((student) => ({
      studentNo: student.studentNo,
      name: student.name,
      className: student.className,
    })),
  };
});
const clearReferences = (payload.clearedAttendance ?? []).map((clear) => ({
  ...clear,
  matchCount: (payload.students ?? []).filter(
    (student) => student.id === clear.studentId
  ).length,
}));

console.log(
  JSON.stringify(
    {
      revision: snapshot.revision,
      dataVersion: payload.dataVersion,
      counts,
      duplicateIds,
      recipients,
      removedRecipients: payload.removedRecipients ?? [],
      staffLeaveRecords: payload.staffLeaveRecords ?? [],
      absenceReferences,
      clearReferences,
    },
    null,
    2
  )
);
