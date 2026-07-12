import { redirect } from "next/navigation";
import { CalendarPage } from "@/components/pages/fusion-static-pages";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessCalendar, isPlatformAdmin } from "@/lib/permissions";

export default async function CalendarRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isPlatformAdmin(profile.role) && !canAccessCalendar(profile)) {
    redirect("/dashboard");
  }
  return <CalendarPage />;
}
