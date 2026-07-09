import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function PdfViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  return children;
}
