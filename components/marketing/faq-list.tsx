"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

export function FaqList() {
  const faq = useDict().marketing.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="marketing-faq__list">
      {faq.items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={item.q}
            className={cn("marketing-faq__item", isOpen && "marketing-faq__item--open")}
          >
            <button
              type="button"
              className="marketing-faq__question"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span>{item.q}</span>
              <ChevronDown aria-hidden size={18} className="marketing-faq__chevron" />
            </button>
            {isOpen ? <p className="marketing-faq__answer">{item.a}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
