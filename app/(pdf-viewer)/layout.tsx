import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocuments } from "@/lib/permissions";

export default async function PdfViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocuments(profile.role)) redirect("/dashboard");

  return children;
}
