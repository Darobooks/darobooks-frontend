"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { storeAccessToken } from "@/app/components/auth-state";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const SETUP_TOKEN_KEY = "twoStepSetupToken";

type SetupDetails = {
  secret: string;
  qrCodeDataUrl: string;
};

async function getResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The security service returned an invalid response.");
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

function isSetupDetails(payload: unknown): payload is SetupDetails {
  return (
    !!payload &&
    typeof payload === "object" &&
    "secret" in payload &&
    typeof payload.secret === "string" &&
    "qrCodeDataUrl" in payload &&
    typeof payload.qrCodeDataUrl === "string" &&
    payload.qrCodeDataUrl.startsWith("data:image/png;base64,")
  );
}

function isTwoStepEnabled(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === "object" &&
    "twoStepEnabled" in payload &&
    payload.twoStepEnabled === true
  );
}

export default function TwoStepForm() {
  const router = useRouter();
  const [setupToken, setSetupToken] = useState("");
  const [setup, setSetup] = useState<SetupDetails | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Preparing your secure setup...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadSetup = async () => {
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
        const response = await fetch(`${API_BASE_URL}/auth/two-step/setup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await getResponsePayload(response);
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload) ??
              `Could not start setup (HTTP ${response.status}). Please try again.`,
          );
        }
        if (isTwoStepEnabled(payload)) {
          router.replace("/recovery");
          return;
        }
        if (!isSetupDetails(payload)) {
          throw new Error(
            "The security service returned incomplete authenticator details.",
          );
        }
        setSetup(payload);
        setStatus("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus(
          error instanceof TypeError
            ? "Could not reach the security service. Check your connection and try again."
            : error instanceof Error
              ? error.message
              : "Could not start two-step setup. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadSetup();
    return () => controller.abort();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || code.length !== 6 || !setupToken) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/two-step/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${setupToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not verify the code (HTTP ${response.status}). Please try again.`,
        );
      }
      if (!isTwoStepEnabled(payload)) {
        throw new Error(
          "The security service returned an unexpected response.",
        );
      }
      if (
        payload &&
        typeof payload === "object" &&
        "accessToken" in payload &&
        typeof payload.accessToken === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(payload.accessToken)
      ) {
        storeAccessToken(payload.accessToken);
      }

      router.push("/recovery");
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the security service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not verify the authenticator code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setStatus(
        "Setup key copied. Keep it private and delete the copy when done.",
      );
    } catch {
      setStatus(
        "Could not copy the setup key. Your browser may require clipboard permission or a secure connection.",
      );
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <ol
        aria-label="Account setup progress"
        className="mb-5 grid grid-cols-4 gap-1.5 font-sora text-[9px] text-slate-500"
      >
        <Step label="Account" complete />
        <Step label="Verify email" complete />
        <Step label="Two-step" active />
        <Step label="Recovery" />
      </ol>

      <h2 className="font-jakarta text-[24px] font-bold tracking-[-0.5px] text-[#111827] sm:text-[27px]">
        Turn on two-step verification
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        Link an authenticator app to your account, then confirm the connection
        with a fresh 6-digit code.
      </p>

      <ol className="mt-4 space-y-3 font-sora text-[11px] leading-[1.5] text-slate-700">
        <Instruction number={1}>
          Install Google Authenticator, Microsoft Authenticator, Authy or
          another TOTP-compatible app.
        </Instruction>
        <Instruction number={2}>
          Scan this unique QR code, or enter the setup key manually.
        </Instruction>
      </ol>

      <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 sm:flex-row sm:justify-center sm:gap-4 sm:p-3.5">
        <div className="flex h-[148px] w-[148px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
          {setup ? (
            <Image
              src={setup.qrCodeDataUrl}
              alt="Unique DaroBooks authenticator setup QR code"
              width={132}
              height={132}
              unoptimized
              className="h-full w-full"
            />
          ) : (
            <span
              className="font-sora text-[10px] text-slate-500"
              role="status"
            >
              {isLoading ? "Preparing..." : "QR code unavailable"}
            </span>
          )}
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="font-sora text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Your private setup key
          </p>
          <p className="mt-1 break-all font-sora text-[11px] font-bold tracking-[0.08em] text-[#111827]">
            {setup?.secret ?? "Available when setup is ready"}
          </p>
          <button
            type="button"
            onClick={handleCopyKey}
            disabled={!setup}
            className="mt-1 rounded px-1 py-0.5 font-sora text-[10px] font-bold text-[#1a4bb8] underline-offset-2 hover:underline disabled:text-slate-400"
          >
            Copy setup key
          </button>
          <p className="mt-1 font-sora text-[10px] leading-[1.45] text-slate-500">
            Keep this key private. Anyone with it can generate your codes.
          </p>
        </div>
      </div>

      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <Instruction number={3}>
          Enter the current 6-digit code shown in your authenticator app.
        </Instruction>
        <div>
          <label className="sr-only" htmlFor="authenticator-code">
            6-digit authenticator code
          </label>
          <input
            id="authenticator-code"
            name="authenticator-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={!setup || isSubmitting}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="0 0 0 0 0 0"
            aria-describedby="two-step-help"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-center font-sora text-[18px] font-bold tracking-[0.45em] text-[#111827] outline-none transition placeholder:text-slate-500 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </div>

        <button
          type="submit"
          disabled={!setup || code.length !== 6 || isSubmitting}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Checking code..." : "Verify and turn on"}
        </button>

        <p
          id="two-step-help"
          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 font-sora text-[10px] leading-[1.5] text-slate-600"
        >
          Codes refresh every 30 seconds. If a code is rejected, check that your
          phone’s date and time are set automatically.
        </p>
        <p
          aria-live="polite"
          className="min-h-4 font-sora text-[10px] text-slate-600"
        >
          {status}
        </p>
      </form>
    </div>
  );
}

function Instruction({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e4f5f3] font-sora text-[10px] font-bold text-[#0b7a75]"
      >
        {number}
      </span>
      <span className="pt-px">{children}</span>
    </li>
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
