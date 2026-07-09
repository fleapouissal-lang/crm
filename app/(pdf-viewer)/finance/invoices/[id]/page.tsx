import { FinancePdfViewerPage } from "@/components/finance/finance-pdf-viewer-page";

export default async function InvoicePdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinancePdfViewerPage kind="invoice" id={id} />;
}
