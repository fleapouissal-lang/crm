import { redirect } from "next/navigation";

export default async function CrmLeadRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  redirect("/dashboard");
}
