import { redirect } from "next/navigation";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";

export default async function NotificationsRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <NotificationsPageClient />;
}
