import { redirect } from "next/navigation";

/** Marketing module removed — redirect to dashboard. */
export default function MarketingPage() {
  redirect("/dashboard");
}
