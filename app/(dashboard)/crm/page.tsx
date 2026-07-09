import { redirect } from "next/navigation";

export default async function CrmRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.stage) qs.set("stage", params.stage);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/leads${suffix}`);
}
