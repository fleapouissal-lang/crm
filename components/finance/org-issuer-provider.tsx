"use client";

import { createContext, useContext, useMemo } from "react";
import {
  financeIssuerFromOrganization,
  type FinanceIssuer,
  type FinanceOrgInput,
} from "@/lib/finance/company-info";

const OrgIssuerContext = createContext<FinanceIssuer | null>(null);

export function OrgIssuerProvider({
  organization,
  children,
}: {
  organization?: FinanceOrgInput | null;
  children: React.ReactNode;
}) {
  const issuer = useMemo(
    () => financeIssuerFromOrganization(organization),
    [
      organization?.id,
      organization?.name,
      organization?.logo_url,
      organization?.rc,
      organization?.country,
      organization?.city,
      organization?.phone,
      organization?.email_domain,
    ]
  );

  return (
    <OrgIssuerContext.Provider value={issuer}>{children}</OrgIssuerContext.Provider>
  );
}

export function useOrgIssuer(): FinanceIssuer {
  const ctx = useContext(OrgIssuerContext);
  return useMemo(() => ctx ?? financeIssuerFromOrganization(null), [ctx]);
}
