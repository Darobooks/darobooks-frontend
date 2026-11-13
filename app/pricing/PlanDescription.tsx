"use client";

import { useRef, type ChangeEvent } from "react";

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function PlanDescription({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {value.split("\n").map((line, index) => {
        const bullet = line.match(/^\s*-\s+(.*)$/);
        return (
          <span key={`line-${index}`} className="block">
            {bullet ? (
              <>
                <span aria-hidden="true">• </span>
                {renderInline(bullet[1], `bullet-${index}`)}
              </>
            ) : (
              renderInline(line, `line-${index}`)
            )}
          </span>
        );
      })}
    </span>
  );
}

export function isPlanLimitFeature(feature: string) {
  const value = feature.trim().toLowerCase();
  return (
    /^\d+ compan(?:y|ies)$/.test(value) ||
    /^\d+ users?$/.test(value) ||
    value === "unlimited users" ||
    /^up to \d+ invoices? (?:a|per) month$/.test(value)
  );
}

export function PlanDescriptionEditor({
  id,
  value,
  onChange,
  required = false,
  maxLength = 250,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyFormatting(format: "bold" | "italic" | "bullet") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    let updated = value;
    let selectionStart = start;
    let selectionEnd = end;

    if (format === "bullet") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineProbe = end > start ? end - 1 : start;
      const nextLineBreak = value.indexOf("\n", lineProbe);
      const lineEnd = nextLineBreak < 0 ? value.length : nextLineBreak;
      const lines = value.slice(lineStart, lineEnd);
      const formattedLines = lines
        .split("\n")
        .map((line) => (line.trimStart().startsWith("- ") ? line : `- ${line}`))
        .join("\n");
      updated =
        value.slice(0, lineStart) + formattedLines + value.slice(lineEnd);
      selectionStart = lineStart;
      selectionEnd = lineStart + formattedLines.length;
    } else {
      const marker = format === "bold" ? "**" : "*";
      updated = `${value.slice(0, start)}${marker}${selected || "text"}${marker}${value.slice(end)}`;
      selectionStart = start + marker.length;
      selectionEnd = selectionStart + (selected || "text").length;
    }
    if (updated.length > maxLength) return;
    onChange(updated);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-[#c7d3ec] focus-within:border-[#1e4fc1] focus-within:ring-2 focus-within:ring-blue-100">
      <div
        role="toolbar"
        aria-label="Description formatting"
        className="flex items-center gap-1 border-b border-[#e1e8f4] bg-[#f7f9fd] p-1"
      >
        <button
          type="button"
          aria-label="Bold selected text"
          title="Bold"
          onClick={() => applyFormatting("bold")}
          className="h-6 min-w-7 rounded px-2 text-[10px] font-bold text-slate-700 hover:bg-white"
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic selected text"
          title="Italic"
          onClick={() => applyFormatting("italic")}
          className="h-6 min-w-7 rounded px-2 text-[10px] italic text-slate-700 hover:bg-white"
        >
          I
        </button>
        <button
          type="button"
          aria-label="Add bullet list"
          title="Bullet list"
          onClick={() => applyFormatting("bullet")}
          className="h-6 min-w-7 rounded px-2 text-[10px] text-slate-700 hover:bg-white"
        >
          • List
        </button>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        required={required}
        maxLength={maxLength}
        rows={4}
        value={value}
        onChange={handleChange}
        placeholder="Describe who this plan is for. Select text and use the toolbar to format it."
        className="w-full resize-y bg-white px-3 py-2 text-[10px] outline-none"
      />
      <div className="border-t border-[#e1e8f4] bg-white px-3 py-1 text-right text-[8px] text-slate-400">
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
