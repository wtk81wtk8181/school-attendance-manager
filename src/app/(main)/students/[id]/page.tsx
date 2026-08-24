import { StudentDetail } from "@/components/student-detail";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentDetail id={id} />;
}
