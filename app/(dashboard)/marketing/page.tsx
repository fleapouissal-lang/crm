import { redirect } from "next/navigation";

/** Marketing is merged into /sales */
export default function MarketingRoutePage() {
  redirect("/sales");
}
