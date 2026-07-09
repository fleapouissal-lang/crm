"use client";

import Link from "next/link";
import { Building2, Palette, Users } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";

const VALUE_ICONS = [Building2, Users, Palette] as const;

export function AboutSections() {
  const a = useDict().marketing.about;

  return (
    <div className="marketing-about-sections">
      <div className="marketing-about-card">
        <div className="marketing-about-card__mission">
          <h2>{a.missionTitle}</h2>
          <p>{a.mission}</p>
        </div>

        <div className="marketing-about-card__values">
          <h2>{a.valuesTitle}</h2>
          <ul className="marketing-about-card__list">
            {a.values.map((value, index) => {
              const Icon = VALUE_ICONS[index] ?? Building2;
              return (
                <li key={value.title}>
                  <span className="marketing-about-card__icon" aria-hidden>
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <section className="marketing-about-cta" aria-labelledby="about-cta-title">
        <div className="marketing-about-cta__inner">
          <div>
            <h2 id="about-cta-title">{a.bottomCta.title}</h2>
            <p>{a.bottomCta.text}</p>
          </div>
          <div className="marketing-about-cta__actions">
            <Link
              href="/pricing"
              className="marketing-about-cta__btn marketing-about-cta__btn--primary"
            >
              {a.bottomCta.primaryButton}
            </Link>
            <Link href="/contact" className="marketing-about-cta__btn">
              {a.bottomCta.secondaryButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
