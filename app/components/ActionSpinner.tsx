"use client";

export default function ActionSpinner({
  label = "Processing",
}: {
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
    />
  );
}
