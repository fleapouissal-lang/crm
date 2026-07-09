import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <MarketingShell>{children}</MarketingShell>
    </div>
  );
}
