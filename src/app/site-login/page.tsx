import { SiteLoginForm } from "@/components/site-login-form";

export default async function SiteLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <SiteLoginForm nextPath={params.next || "/"} />;
}
