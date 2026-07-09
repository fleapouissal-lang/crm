"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

export function FaqList() {
  const faq = useDict().marketing.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="marketing-faq">
      <div className="marketing-faq__list">
        {faq.items.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <article
              key={item.q}
              className={cn("marketing-faq__item", isOpen && "marketing-faq__item--open")}
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

      <p className="marketing-faq__footer">
        {faq.contactPrompt}{" "}
        <Link href="/contact">{faq.contactLink}</Link>
      </p>
    </div>
  );
}
