"use client";

import { useEffect, useRef, useState } from "react";
import {
  RiCheckboxCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react";
import type { ToastDetail, ToastType } from "./toast";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const toastStyles: Record<
  ToastType,
  { border: string; icon: typeof RiCheckboxCircleLine; iconColor: string }
> = {
  success: {
    border: "border-emerald-200",
    icon: RiCheckboxCircleLine,
    iconColor: "text-emerald-600",
  },
  error: {
    border: "border-red-200",
    icon: RiErrorWarningLine,
    iconColor: "text-red-600",
  },
  info: {
    border: "border-blue-200",
    icon: RiInformationLine,
    iconColor: "text-blue-600",
  },
};

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const recentMessages = useRef(new Map<string, number>());

  useEffect(() => {
    const activeTimers = timers.current;
    const dismiss = (id: number) => {
      const timer = activeTimers.get(id);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        activeTimers.delete(id);
      }
      setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    const handleToast = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      const toast =
        typeof detail === "string"
          ? { message: detail, type: "success" as const }
          : isToastDetail(detail)
            ? detail
            : null;
      if (!toast || !toast.message.trim()) return;
      if (
        /^(loading|processing)(?:\.\.\.|…)?$/i.test(toast.message.trim()) ||
        /^processing$/i.test(toast.message.trim())
      ) {
        return;
      }
      const dedupeKey = `${toast.type}:${toast.message.trim()}`;
      const now = Date.now();
      if ((recentMessages.current.get(dedupeKey) ?? 0) > now - 1500) return;
      recentMessages.current.set(dedupeKey, now);

      const id = ++nextId.current;
      const type = toast.type ?? "success";
      setToasts((current) => [
        ...current.slice(-3),
        { id, message: toast.message, type },
      ]);
      activeTimers.set(
        id,
        window.setTimeout(() => dismiss(id), 5000),
      );
    };

    window.addEventListener("darobooks:toast", handleToast);

    const reportedElements = new WeakSet<Element>();
    const reportAccessibleMessages = (root: ParentNode) => {
      const candidates = Array.from(
        root.querySelectorAll<HTMLElement>('[role="alert"], [role="status"]'),
      );
      if (root instanceof HTMLElement && root.matches('[role="alert"], [role="status"]')) {
        candidates.unshift(root);
      }
      candidates.forEach((element) => {
        if (
          reportedElements.has(element) ||
          element.closest('[data-toast-viewport]')
        ) {
          return;
        }
        const message = element.textContent?.replace(/\s+/g, " ").trim();
        if (!message) return;
        if (
          /^(loading|processing)(?:\.\.\.|…)?$/i.test(message) ||
          /^(loading|processing)\b/i.test(message)
        ) {
          return;
        }
        reportedElements.add(element);
        window.dispatchEvent(
          new CustomEvent<ToastDetail>("darobooks:toast", {
            detail: {
              message,
              type: element.getAttribute("role") === "alert" ? "error" : "success",
            },
          }),
        );
      });
    };

    reportAccessibleMessages(document);
    const messageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) reportAccessibleMessages(node);
        });
        if (
          mutation.type === "characterData" &&
          mutation.target.parentElement
        ) {
          reportAccessibleMessages(mutation.target.parentElement);
        }
      });
    });
    messageObserver.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener("darobooks:toast", handleToast);
      messageObserver.disconnect();
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <div
      data-toast-viewport
      className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[min(420px,calc(100vw-2rem))] sm:items-end sm:px-0"
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border ${style.border} bg-white px-4 py-3 text-[12px] text-slate-800 shadow-lg`}
          >
            <Icon
              aria-hidden="true"
              className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`}
            />
            <p className="min-w-0 flex-1 leading-relaxed">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => {
                const timer = timers.current.get(toast.id);
                if (timer !== undefined) {
                  window.clearTimeout(timer);
                  timers.current.delete(toast.id);
                }
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                );
              }}
              className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function isToastDetail(value: unknown): value is ToastDetail {
  return (
    !!value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string" &&
    (!("type" in value) ||
      value.type === "success" ||
      value.type === "error" ||
      value.type === "info")
  );
}
