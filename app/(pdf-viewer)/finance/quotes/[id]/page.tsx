import { FinancePdfViewerPage } from "@/components/finance/finance-pdf-viewer-page";

export default async function QuotePdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinancePdfViewerPage kind="quote" id={id} />;
}
