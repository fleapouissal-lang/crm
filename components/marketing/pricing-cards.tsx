"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";

const PACK_ORDER = ["starter", "business", "enterprise"] as const;

export function PricingCards() {
  const p = useDict().marketing.pricing;

  return (
    <div className="marketing-pricing__grid">
      {PACK_ORDER.map((key) => {
        const pack = p.packs[key];
        const isPopular = key === "business";

        return (
          <article
            key={key}
            className={`marketing-pricing__card${isPopular ? " marketing-pricing__card--popular" : ""}`}
          >
            {isPopular ? (
              <span className="marketing-pricing__badge">{p.popular}</span>
            ) : null}
            <span className="marketing-pricing__trial">{p.trialBadge}</span>
            <h3>{pack.name}</h3>
            <p className="marketing-pricing__desc">{pack.description}</p>
            <div className="marketing-pricing__price">
              <span className="marketing-pricing__amount">€{pack.price}</span>
              <span className="marketing-pricing__period">{p.perMonth}</span>
            </div>
            <ul className="marketing-pricing__features">
              {pack.features.map((feature) => (
                <li key={feature}>
                  <Check aria-hidden size={16} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={
                isPopular
                  ? "marketing-pricing__cta marketing-pricing__cta--primary"
                  : "marketing-pricing__cta"
              }
            >
              {key === "enterprise" ? p.ctaContact : p.cta}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
