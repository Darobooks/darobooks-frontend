"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiAlertLine, RiDeleteBinLine } from "@remixicon/react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    if (resolveRef.current) resolveRef.current(false);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOptions(null);
    resolve?.(confirmed);
  }, []);

  useEffect(() => {
    if (!options) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, options]);

  const dialog = options ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-[390px] rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              options.destructive
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-[#1e4fc1]"
            }`}
          >
            {options.destructive ? (
              <RiDeleteBinLine className="h-4 w-4" />
            ) : (
              <RiAlertLine className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-[13px] font-bold text-[#10213c]"
            >
              {options.title}
            </h2>
            <p
              id="confirm-dialog-message"
              className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-slate-600"
            >
              {options.message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={() => close(false)}
            className="rounded-lg border border-[#dbe4f3] px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-white transition ${
              options.destructive
                ? "bg-red-700 hover:bg-red-800"
                : "bg-[#1e4fc1] hover:bg-[#183f9b]"
            }`}
          >
            {options.destructive && <RiDeleteBinLine className="h-3.5 w-3.5" />}
            {options.confirmLabel ?? "Continue"}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return { confirm, dialog };
}
