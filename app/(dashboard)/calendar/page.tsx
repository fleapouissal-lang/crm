import { redirect } from "next/navigation";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getTasks } from "@/lib/actions/tasks";
import { listAppointments } from "@/lib/actions/sales-agent";
import { canAccessCalendar, isPlatformAdmin } from "@/lib/permissions";

export default async function CalendarRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isPlatformAdmin(profile.role) && !canAccessCalendar(profile)) {
    redirect("/dashboard");
  }

  const tasks = isPlatformAdmin(profile.role) ? [] : await getTasks();
  const appointments = isPlatformAdmin(profile.role) ? [] : await listAppointments();

  return <CalendarPageClient tasks={tasks} appointments={appointments} />;
}
