"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LifeBuoy,
  Rocket,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

type FaqCategory = "trial" | "ste" | "security" | "billing" | "roles" | "support";

const CATEGORY_ICONS: Record<FaqCategory, typeof Rocket> = {
  trial: Rocket,
  ste: Building2,
  security: ShieldCheck,
  billing: CircleDollarSign,
  roles: UserCog,
  support: LifeBuoy,
};

const CATEGORY_ORDER: FaqCategory[] = [
  "trial",
  "ste",
  "security",
  "billing",
  "roles",
  "support",
];

export function FaqList() {
  const faq = useDict().marketing.faq;
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("trial");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const counts = useMemo(() => {
    const map: Record<FaqCategory, number> = {
      trial: 0,
      ste: 0,
      security: 0,
      billing: 0,
      roles: 0,
      support: 0,
    };
    for (const item of faq.items) {
      map[item.category as FaqCategory]++;
    }
    return map;
  }, [faq.items]);

  const visibleCategories = useMemo(
    () => CATEGORY_ORDER.filter((key) => counts[key] > 0),
    [counts]
  );

  const filteredItems = useMemo(
    () => faq.items.filter((item) => item.category === activeCategory),
    [activeCategory, faq.items]
  );

  return (
    <div className="marketing-faq-card">
      <div className="marketing-faq">
        <aside className="marketing-faq__sidebar">
          <h2 className="marketing-faq__sidebar-title">{faq.sidebarTitle}</h2>

          <ul className="marketing-faq__categories" role="tablist">
            {visibleCategories.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const count = counts[key];

              return (
                <li key={key}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === key}
                    className={cn(
                      "marketing-faq__category",
                      activeCategory === key && "marketing-faq__category--active"
                    )}
                    onClick={() => {
                      setActiveCategory(key);
                      setOpenIndex(0);
                    }}
                  >
                    <span className="marketing-faq__category-icon" aria-hidden>
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <span className="marketing-faq__category-body">
                      <span className="marketing-faq__category-label">
                        {faq.categories[key]}
                      </span>
                      <span className="marketing-faq__category-count">
                        {faq.articlesCount.replace("{count}", String(count))}
                      </span>
                    </span>
                    {activeCategory === key ? (
                      <ChevronRight
                        size={16}
                        strokeWidth={2}
                        className="marketing-faq__category-arrow"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="marketing-faq__cta">
            <h3>{faq.stillQuestion}</h3>
            <p>{faq.stillQuestionDesc}</p>
            <Link href="/contact" className="marketing-faq__cta-btn">
              {faq.contactCta}
            </Link>
          </div>
        </aside>

        <div className="marketing-faq__main">
          <div className="marketing-faq__list">
            {filteredItems.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <article
                  key={item.q}
                  className={cn(
                    "marketing-faq__item",
                    isOpen && "marketing-faq__item--open"
                  )}
                >
                  <button
                    type="button"
                    className="marketing-faq__question"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="marketing-faq__q-text">{item.q}</span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      className="marketing-faq__chevron"
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "marketing-faq__answer-wrap",
                      isOpen && "marketing-faq__answer-wrap--open"
                    )}
                  >
                    <p className="marketing-faq__answer">{item.a}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
