import { WarningDetail } from "@/components/warning-detail";

export default async function WarningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WarningDetail id={id} />;
}
