import { redirect } from "next/navigation";

/** Public signup disabled — companies are created by the platform administrator. */
export default function SignupPage() {
  redirect("/login");
}
