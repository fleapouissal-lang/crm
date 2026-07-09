"use client";

import Link from "next/link";
import {
  Building2,
  Check,
  Minus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";

const PACK_ORDER = ["free", "starter", "business", "enterprise"] as const;
const HIGHLIGHT_ICONS = [ShieldCheck, Building2, Sparkles] as const;

function CompareCell({ value }: { value: string }) {
  if (value === "check") {
    return (
      <span className="marketing-pricing-compare__icon marketing-pricing-compare__icon--yes">
        <Check aria-hidden size={18} strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "dash") {
    return (
      <span className="marketing-pricing-compare__icon marketing-pricing-compare__icon--no">
        <Minus aria-hidden size={18} strokeWidth={2.5} />
      </span>
    );
  }
  return <span className="marketing-pricing-compare__text">{value}</span>;
}

export function PricingExtras() {
  const p = useDict().marketing.pricing;

  return (
    <div className="marketing-pricing-extras">
      <section className="marketing-pricing-highlights" aria-labelledby="pricing-highlights-title">
        <div className="marketing-pricing-section__head">
          <h2 id="pricing-highlights-title">{p.highlights.title}</h2>
          <p>{p.highlights.subtitle}</p>
        </div>
        <div className="marketing-pricing-highlights__grid">
          {p.highlights.items.map((item, index) => {
            const Icon = HIGHLIGHT_ICONS[index] ?? Sparkles;
            return (
              <article key={item.title} className="marketing-pricing-highlights__card">
                <span className="marketing-pricing-highlights__icon" aria-hidden>
                  <Icon size={22} strokeWidth={2} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-pricing-compare" aria-labelledby="pricing-compare-title">
        <div className="marketing-pricing-section__head">
          <h2 id="pricing-compare-title">{p.comparison.title}</h2>
          <p>{p.comparison.subtitle}</p>
        </div>
        <div className="marketing-pricing-compare__card">
          <div className="marketing-pricing-compare__scroll">
            <table className="marketing-pricing-compare__table">
              <thead>
                <tr>
                  <th scope="col">{p.comparison.featureCol}</th>
                  {PACK_ORDER.map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className={
                        key === "business"
                          ? "marketing-pricing-compare__col--popular"
                          : undefined
                      }
                    >
                      {p.packs[key].name}
                      {key === "business" ? (
                        <span className="marketing-pricing-compare__popular">{p.popular}</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {PACK_ORDER.map((key) => (
                      <td
                        key={key}
                        className={
                          key === "business"
                            ? "marketing-pricing-compare__col--popular"
                            : undefined
                        }
                      >
                        <CompareCell value={row.values[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="marketing-pricing-bottom-cta" aria-labelledby="pricing-cta-title">
        <div className="marketing-pricing-bottom-cta__inner">
          <div>
            <h2 id="pricing-cta-title">{p.bottomCta.title}</h2>
            <p>{p.bottomCta.text}</p>
          </div>
          <Link href="/contact" className="marketing-pricing-bottom-cta__btn">
            {p.bottomCta.button}
          </Link>
        </div>
      </section>
    </div>
  );
}
