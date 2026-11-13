"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const SETUP_TOKEN_KEY = "twoStepSetupToken";

async function getResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The recovery service returned an invalid response.");
  }
}

function getErrorMessage(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "message" in payload) {
    const { message } = payload;
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(" ");
    }
  }
  return undefined;
}

function getRecoveryCodes(payload: unknown): string[] | undefined {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("codes" in payload) ||
    !Array.isArray(payload.codes) ||
    payload.codes.length !== 10 ||
    !payload.codes.every(
      (code) =>
        typeof code === "string" &&
        /^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/.test(code),
    )
  ) {
    return undefined;
  }
  return payload.codes;
}

function getSavedSuccess(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === "object" &&
    "recoveryCodesSaved" in payload &&
    payload.recoveryCodesSaved === true
  );
}

export default function RecoveryCodes() {
  const router = useRouter();
  const [setupToken, setSetupToken] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("Preparing your recovery codes...");

  useEffect(() => {
    const controller = new AbortController();
    const loadCodes = async () => {
      const token = await Promise.resolve().then(
        () =>
          window.sessionStorage.getItem(SETUP_TOKEN_KEY) ??
          window.sessionStorage.getItem("darobooksAccessToken"),
      );
      if (controller.signal.aborted) return;
      if (!token) {
        setStatus(
          "This setup session is missing or expired. Contact support to continue account setup.",
        );
        setIsLoading(false);
        return;
      }

      setSetupToken(token);
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/two-step/recovery-codes`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        const payload = await getResponsePayload(response);
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload) ??
              `Could not load recovery codes (HTTP ${response.status}). Please try again.`,
          );
        }
        const recoveryCodes = getRecoveryCodes(payload);
        if (!recoveryCodes) {
          throw new Error(
            "The recovery service returned an unexpected response.",
          );
        }
        setCodes(recoveryCodes);
        setStatus("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus(
          error instanceof TypeError
            ? "Could not reach the recovery service. Check your connection and try again."
            : error instanceof Error
              ? error.message
              : "Could not load your recovery codes. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadCodes();
    return () => controller.abort();
  }, []);

  const handleCopy = async () => {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setStatus(
        "Recovery codes copied. Store them in a private, secure location.",
      );
    } catch {
      setStatus(
        "Could not copy the codes. Your browser may require clipboard permission or a secure connection.",
      );
    }
  };

  const handleDownload = () => {
    if (!codes) return;
    const file = new Blob(
      [
        "DAROBOOKS RECOVERY CODES\n",
        "Each code can be used once to recover access to your account.\n",
        "Store these codes securely and do not share them.\n\n",
        ...codes.map((code) => `${code}\n`),
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "darobooks-recovery-codes.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    setStatus(
      "Recovery codes downloaded. Store the file somewhere private and secure.",
    );
  };

  const handlePrint = (event: MouseEvent<HTMLButtonElement>) => {
    if (!codes) return;
    document.body.dataset.printRecoveryCodes = "true";
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.printRecoveryCodes;
    }, 1000);
    event.currentTarget.blur();
  };

  const handleFinish = async () => {
    if (!hasSavedCodes || !setupToken || isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/two-step/recovery-codes/confirm`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${setupToken}` },
        },
      );
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not finish setup (HTTP ${response.status}). Please try again.`,
        );
      }
      if (!getSavedSuccess(payload)) {
        throw new Error(
          "The recovery service returned an unexpected response.",
        );
      }

      window.sessionStorage.removeItem(SETUP_TOKEN_KEY);
      router.replace(
        window.sessionStorage.getItem("darobooksAccessToken")
          ? "/workspace-setup"
          : "/login",
      );
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the recovery service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not finish account setup. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-recovery-print-root className="w-full max-w-[420px]">
      <ol
        aria-label="Account setup progress"
        className="mb-5 grid grid-cols-5 gap-1.5 font-sora text-[9px] text-slate-500"
      >
        <Step label="Account" complete />
        <Step label="Verify email" complete />
        <Step label="Two-step" complete />
        <Step label="Recovery" active />
        <Step label="Workspace" />
      </ol>

      <h2 className="font-jakarta text-[24px] font-bold tracking-[-0.5px] text-[#111827] sm:text-[27px]">
        Save your recovery codes
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        Keep these codes as a backup for when you cannot access your
        authenticator. Store them somewhere safe and private.
      </p>

      <div
        data-recovery-codes-grid
        aria-label="Your one-time recovery codes"
        aria-busy={isLoading}
        className="mt-4 grid grid-cols-1 gap-1.5 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:grid-cols-2"
      >
        {codes ? (
          codes.map((code) => (
            <code
              key={code}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center font-sora text-[10px] font-bold tracking-[0.04em] text-[#111827] sm:text-[11px]"
            >
              {code}
            </code>
          ))
        ) : (
          <p
            role="status"
            className="col-span-full py-6 text-center font-sora text-[11px] text-slate-600"
          >
            {isLoading ? "Generating your codes..." : "Codes are unavailable."}
          </p>
        )}
      </div>

      <div data-recovery-print-hide className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!codes}
          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 font-sora text-[10px] font-bold text-[#08172e] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Download
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!codes}
          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 font-sora text-[10px] font-bold text-[#08172e] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!codes}
          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 font-sora text-[10px] font-bold text-[#08172e] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Print
        </button>
      </div>

      <p className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 font-sora text-[10px] leading-[1.5] text-orange-900">
        <strong className="font-bold">Keep these private: </strong>
        DaroBooks stores only protected code hashes. You will not be able to
        view this set again after confirming that you have saved it.
      </p>
      <p className="mt-2 font-sora text-[10px] leading-[1.5] text-slate-600">
        Recovery-code sign-in is not connected yet, so these codes cannot be
        used to log in until that flow is available.
      </p>

      <label
        data-recovery-print-hide
        className="mt-3 flex cursor-pointer items-start gap-2 font-sora text-[10px] leading-[1.5] text-slate-700"
      >
        <input
          type="checkbox"
          checked={hasSavedCodes}
          disabled={!codes || isSubmitting}
          onChange={(event) => setHasSavedCodes(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#0b7a75] disabled:cursor-not-allowed"
        />
        <span>I have saved these recovery codes somewhere safe.</span>
      </label>

      <button
        data-recovery-print-hide
        type="button"
        disabled={!hasSavedCodes || !codes || isSubmitting}
        onClick={() => void handleFinish()}
        className="mt-3 w-full rounded-lg bg-[#1a4bb8] px-4 py-2.5 font-sora text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {isSubmitting ? "Finishing setup..." : "Continue to company setup"}
      </button>
      <p
        data-recovery-print-hide
        aria-live="polite"
        className="mt-2 min-h-4 font-sora text-[10px] text-slate-600"
      >
        {status}
      </p>
    </div>
  );
}

function Step({
  label,
  active = false,
  complete = false,
}: {
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className={`border-t-[3px] pt-1 ${
        active
          ? "border-[#0b7a75] font-bold text-[#111827]"
          : complete
            ? "border-[#0b7a75] text-slate-600"
            : "border-[#dbe5f7] text-slate-500"
      }`}
    >
      {label}
    </li>
  );
}
