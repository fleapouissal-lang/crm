import { redirect } from "next/navigation";
import { ExpensesPageClient } from "@/components/finance/expenses-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getExpenses } from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function FinanceExpensesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const expenses = await getExpenses();
  return <ExpensesPageClient initialExpenses={expenses} />;
}
