import { useEffect, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export type ToastDetail = {
  message: string;
  type?: ToastType;
};

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("darobooks:toast", {
      detail: { message, type },
    }),
  );
}

export function useToastOnChange(message: string, type: ToastType = "error") {
  const previousMessage = useRef("");

  useEffect(() => {
    if (!message) {
      previousMessage.current = "";
      return;
    }
    if (message === previousMessage.current) return;
    previousMessage.current = message;
    showToast(message, type);
  }, [message, type]);
}
