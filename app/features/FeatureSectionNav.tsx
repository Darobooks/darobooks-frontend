"use client";

import { useEffect, useRef, useState } from "react";

const featureLinks = [
  { label: "Invoicing", id: "inv" },
  { label: "Bills", id: "bills" },
  { label: "Banking", id: "bank" },
  { label: "Tax", id: "tax" },
  { label: "Groups", id: "group" },
  { label: "Reports", id: "reports" },
];

export default function FeatureSectionNav() {
  const [activeId, setActiveId] = useState(featureLinks[0].id);
  const pendingId = useRef<string | null>(null);

  useEffect(() => {
    const sections = featureLinks
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.35;
      if (pendingId.current) {
        const pendingSection = document.getElementById(pendingId.current);

        if (
          pendingSection &&
          pendingSection.getBoundingClientRect().top > activationLine
        ) {
          return;
        }

        pendingId.current = null;
      }

      let currentId = featureLinks[0].id;

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationLine) {
          currentId = section.id;
        } else {
          break;
        }
      }

      setActiveId(currentId);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const navigateToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    event.preventDefault();
    const section = document.getElementById(id);

    if (!section) {
      throw new Error(`Feature section "${id}" could not be found.`);
    }

    setActiveId(id);
    pendingId.current = id;
    window.history.pushState(null, "", `#${id}`);
    section.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <nav
      aria-label="Jump to a feature"
      className="mt-2 flex flex-wrap gap-2"
    >
      {featureLinks.map((item) => {
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            onClick={(event) => navigateToSection(event, item.id)}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-300 ${
              isActive
                ? "border-[#0b7a75] bg-[#0b7a75] text-white shadow-sm"
                : "border-[#bfe3e0] bg-white text-[#0b7a75] hover:border-[#0b7a75] hover:bg-[#effaf8]"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
