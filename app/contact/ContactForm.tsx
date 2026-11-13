"use client";

import { useState, type FormEvent } from "react";
import { showToast } from "@/app/components/toast";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const topics = [
  "General question",
  "Product support",
  "Billing",
  "Sales",
  "Other",
];

async function getResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The contact service returned an invalid response.");
  }
}

function getApiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }
  const { message } = payload;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join(" ");
  }
  return undefined;
}

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          topic: formData.get("topic"),
          message: formData.get("message"),
        }),
      });
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Your message could not be sent (HTTP ${response.status}). Please try again.`,
        );
      }

      form.reset();
      showToast("Thanks for reaching out. Your message has been received.");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Your message could not be sent. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClassName =
    "mt-1.5 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2.5 font-sora text-[12px] text-[#08172e] outline-none transition placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-[#1a4bb8]/15";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-full-name"
            className="font-sora text-[11px] font-semibold text-[#16314e]"
          >
            Your name
          </label>
          <input
            id="contact-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            className={fieldClassName}
            placeholder="Your full name"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="font-sora text-[11px] font-semibold text-[#16314e]"
          >
            Email address
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            className={fieldClassName}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-topic"
          className="font-sora text-[11px] font-semibold text-[#16314e]"
        >
          What can we help with?
        </label>
        <select
          id="contact-topic"
          name="topic"
          required
          defaultValue=""
          className={fieldClassName}
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="font-sora text-[11px] font-semibold text-[#16314e]"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          minLength={10}
          maxLength={5000}
          required
          className={`${fieldClassName} resize-y`}
          placeholder="How can our team help?"
        />
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[420px] font-sora text-[10px] leading-[1.6] text-slate-500">
          By sending this message, you agree that we may use your details to
          respond. See our{" "}
          <a href="/privacy" className="font-semibold text-[#1a4bb8] underline">
            Privacy Policy
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-[#1a4bb8] px-5 py-3 font-sora text-[12px] font-bold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a4bb8] disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
