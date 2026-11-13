"use client";

import { useState } from "react";

const pricingQuestions = [
  {
    question: "Why is DaroBooks so much cheaper?",
    answer:
      "One product for all countries, self-service support and annual billing keep our costs low, and we charge per company instead of per seat. We pass the savings on.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Free covers one company and one user plus your accountant, with up to 25 invoices a month. Upgrade when you need bank reconciliation, payroll or approvals.",
  },
  {
    question: "Why do prices differ by region?",
    answer:
      "We set prices to local purchasing power, while keeping core features available to all. Foreign exchange is updated automatically, and billing follows the country of your payment method.",
  },
  {
    question: "Will the price go up?",
    answer:
      "Launch prices are locked for your first 12 months, and we will tell you well ahead of any change after that.",
  },
  {
    question: "Does it handle VAT, GST and withholding tax?",
    answer:
      "Yes. Pick your country and DaroBooks loads its tax names and rates. Every rate is a setting you control.",
  },
  {
    question: "What happens to my data if I leave?",
    answer:
      "You can export everything, including reports and transactions, at any time.",
  },
];

export default function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-4 divide-y divide-[#c7d3ec]">
      {pricingQuestions.map(({ question, answer }, index) => {
        const isOpen = openIndex === index;
        const buttonId = `pricing-question-${index}`;
        const panelId = `pricing-answer-${index}`;

        return (
          <article key={question} className="py-1">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenIndex((current) =>
                    current === index ? null : index,
                  )
                }
                className="flex w-full items-center justify-between gap-4 py-3 text-left text-[14px] font-bold text-[#08172e]"
              >
                <span>{question}</span>
                <span
                  aria-hidden="true"
                  className="text-[20px] font-normal text-[#0b7a75]"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-3"
            >
              <p className="text-[13px] leading-[1.65] text-slate-600">
                {answer}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
