import { SiteLoginForm } from "@/components/site-login-form";

export default async function SiteLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";
  return <SiteLoginForm nextPath={nextPath} />;
}
