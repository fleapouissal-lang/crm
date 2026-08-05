"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  financeIssuerFromOrganization,
  type FinanceIssuer,
  type FinanceOrgInput,
} from "@/lib/finance/company-info";
import {
  updateFinancePriceMode,
  updateFinanceTvaRate,
} from "@/lib/actions/finance-issuer";
import type { PriceMode } from "@/lib/finance/types";

type OrgIssuerContextValue = {
  issuer: FinanceIssuer;
  priceMode: PriceMode;
  setPriceMode: (mode: PriceMode) => void;
  tvaRate: number;
  setTvaRate: (rate: number) => void;
  canManageFinanceSettings: boolean;
};

const OrgIssuerContext = createContext<OrgIssuerContextValue | null>(null);

function priceModeStorageKey(orgId: string) {
  return `fl-price-mode-${orgId}`;
}

function tvaRateStorageKey(orgId: string) {
  return `fl-tva-rate-${orgId}`;
}

export function OrgIssuerProvider({
  organization,
  canManageFinanceSettings = false,
  canManagePriceMode = false,
  children,
}: {
  organization?: FinanceOrgInput | null;
  /** @deprecated use canManageFinanceSettings */
  canManagePriceMode?: boolean;
  canManageFinanceSettings?: boolean;
  children: React.ReactNode;
}) {
  const canManage = canManageFinanceSettings || canManagePriceMode;

  const baseIssuer = useMemo(
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
      organization?.finance_price_mode,
      organization?.finance_tva_rate,
    ]
  );

  const [priceMode, setPriceModeState] = useState<PriceMode>(baseIssuer.priceMode);
  const [tvaRate, setTvaRateState] = useState<number>(baseIssuer.tvaRate);

  useEffect(() => {
    if (!organization?.id) {
      setPriceModeState(baseIssuer.priceMode);
      setTvaRateState(baseIssuer.tvaRate);
      return;
    }

    if (organization.finance_price_mode) {
      setPriceModeState(organization.finance_price_mode);
    } else {
      try {
        const stored = localStorage.getItem(priceModeStorageKey(organization.id));
        if (stored === "ht" || stored === "ttc") {
          setPriceModeState(stored);
        } else {
          setPriceModeState(baseIssuer.priceMode);
        }
      } catch {
        setPriceModeState(baseIssuer.priceMode);
      }
    }

    if (organization.finance_tva_rate != null) {
      setTvaRateState(baseIssuer.tvaRate);
      return;
    }

    try {
      const stored = localStorage.getItem(tvaRateStorageKey(organization.id));
      if (stored != null && stored !== "") {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed)) {
          setTvaRateState(Math.min(1, Math.max(0, parsed)));
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setTvaRateState(baseIssuer.tvaRate);
  }, [
    baseIssuer.priceMode,
    baseIssuer.tvaRate,
    organization?.id,
    organization?.finance_price_mode,
    organization?.finance_tva_rate,
  ]);

  const setPriceMode = useCallback(
    (mode: PriceMode) => {
      if (!canManage) return;
      setPriceModeState(mode);
      if (organization?.id) {
        try {
          localStorage.setItem(priceModeStorageKey(organization.id), mode);
        } catch {
          /* ignore */
        }
        void updateFinancePriceMode(mode);
      }
    },
    [canManage, organization?.id]
  );

  const setTvaRate = useCallback(
    (rate: number) => {
      if (!canManage) return;
      const normalized = Math.min(1, Math.max(0, rate));
      setTvaRateState(normalized);
      if (organization?.id) {
        try {
          localStorage.setItem(tvaRateStorageKey(organization.id), String(normalized));
        } catch {
          /* ignore */
        }
        void updateFinanceTvaRate(normalized);
      }
    },
    [canManage, organization?.id]
  );

  const issuer = useMemo(
    () => ({ ...baseIssuer, priceMode, tvaRate }),
    [baseIssuer, priceMode, tvaRate]
  );

  const value = useMemo(
    () => ({
      issuer,
      priceMode,
      setPriceMode,
      tvaRate,
      setTvaRate,
      canManageFinanceSettings: canManage,
    }),
    [issuer, priceMode, setPriceMode, tvaRate, setTvaRate, canManage]
  );

  return (
    <OrgIssuerContext.Provider value={value}>{children}</OrgIssuerContext.Provider>
  );
}

export function useOrgIssuer(): FinanceIssuer {
  const ctx = useContext(OrgIssuerContext);
  return useMemo(
    () => ctx?.issuer ?? financeIssuerFromOrganization(null),
    [ctx?.issuer]
  );
}

export function useFinancePriceMode() {
  const ctx = useContext(OrgIssuerContext);
  return {
    priceMode: ctx?.priceMode ?? ("ttc" as PriceMode),
    setPriceMode: ctx?.setPriceMode ?? (() => {}),
    canManagePriceMode: ctx?.canManageFinanceSettings ?? false,
  };
}

export function useFinanceSettings() {
  const ctx = useContext(OrgIssuerContext);
  return {
    priceMode: ctx?.priceMode ?? ("ttc" as PriceMode),
    setPriceMode: ctx?.setPriceMode ?? (() => {}),
    tvaRate: ctx?.tvaRate ?? 0.2,
    setTvaRate: ctx?.setTvaRate ?? (() => {}),
    canManageFinanceSettings: ctx?.canManageFinanceSettings ?? false,
  };
}
