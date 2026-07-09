import { getLocalizedDict } from "@/lib/i18n/server";
import { SignupForm } from "@/components/auth/signup-form";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.auth.signup };
}

export default function SignupPage() {
  return <SignupForm />;
}
