"use client";

import { useEffect, useState } from "react";

type ProcessingDetail = { active: number };

export default function ProcessingViewport() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    let nativeFetch = window.fetch;
    let pending = 0;
    const update = (next: number) => {
      pending = next;
      window.dispatchEvent(
        new CustomEvent<ProcessingDetail>("darobooks:processing", {
          detail: { active: pending },
        }),
      );
      setActiveCount(pending);
    };

    window.fetch = function loadingFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ) {
      update(pending + 1);
      return nativeFetch(input, init).finally(() => update(Math.max(0, pending - 1)));
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  if (activeCount === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[210] h-[3px] overflow-hidden bg-blue-100"
      role="status"
      aria-label="Processing"
    >
      <div className="processing-progress h-full w-full origin-left bg-[#1e4fc1]" />
    </div>
  );
}
