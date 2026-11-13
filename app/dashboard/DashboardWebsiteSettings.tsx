"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { showToast, useToastOnChange } from "@/app/components/toast";
import ActionSpinner from "../components/ActionSpinner";
import DashboardLoading from "./DashboardLoading";

type WebsiteInfo = {
  siteName: string;
  tagline: string;
  supportEmail: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  websiteUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  xUrl: string;
  logoUploaded: boolean;
};
type PaymentGatewayStatus = {
  provider: "paystack" | "flutterwave" | "paypal" | "stripe";
  name: string;
  configured: boolean;
  environment: "not_configured" | "test" | "live" | "unknown";
};

type WebsiteSettingsStatus = {
  paymentGateways: PaymentGatewayStatus[];
  paymentGateway: {
    provider: "paystack";
    configured: boolean;
    environment: "not_configured" | "test" | "live" | "unknown";
  };
  email: {
    provider: string;
    configured: boolean;
    fromAddressConfigured: boolean;
    apiKeyConfigured: boolean;
    smtpHostConfigured: boolean;
    smtpCredentialsConfigured: boolean;
  };
  databaseBackup: {
    databaseConnected: boolean;
    manualBackupAvailable: boolean;
    automatedBackupsManagedByApp: false;
  };
  websiteInfo: WebsiteInfo;
};

type SettingsTab = "payment" | "email" | "backup" | "website";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const websiteFieldClass =
  "mt-1 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2 text-[11px] text-[#10213c] outline-none transition placeholder:text-slate-400 focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100";

function isWebsiteSettingsStatus(
  value: unknown,
): value is WebsiteSettingsStatus {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<WebsiteSettingsStatus>;
  return (
    !!settings.paymentGateway &&
    settings.paymentGateway.provider === "paystack" &&
    typeof settings.paymentGateway.configured === "boolean" &&
    ["not_configured", "test", "live", "unknown"].includes(
      settings.paymentGateway.environment,
    ) &&
    Array.isArray(settings.paymentGateways) &&
    settings.paymentGateways.every(isPaymentGatewayStatus) &&
    !!settings.email &&
    typeof settings.email.provider === "string" &&
    typeof settings.email.configured === "boolean" &&
    typeof settings.email.fromAddressConfigured === "boolean" &&
    typeof settings.email.apiKeyConfigured === "boolean" &&
    typeof settings.email.smtpHostConfigured === "boolean" &&
    typeof settings.email.smtpCredentialsConfigured === "boolean" &&
    !!settings.databaseBackup &&
    typeof settings.databaseBackup.databaseConnected === "boolean" &&
    typeof settings.databaseBackup.manualBackupAvailable === "boolean" &&
    settings.databaseBackup.automatedBackupsManagedByApp === false &&
    isWebsiteInfo(settings.websiteInfo)
  );
}

function isPaymentGatewayStatus(value: unknown): value is PaymentGatewayStatus {
  if (!value || typeof value !== "object") return false;
  const gateway = value as Partial<PaymentGatewayStatus>;
  return (
    (gateway.provider === "paystack" ||
      gateway.provider === "flutterwave" ||
      gateway.provider === "paypal" ||
      gateway.provider === "stripe") &&
    typeof gateway.name === "string" &&
    typeof gateway.configured === "boolean" &&
    typeof gateway.environment === "string" &&
    ["not_configured", "test", "live", "unknown"].includes(gateway.environment)
  );
}

function isWebsiteInfo(value: unknown): value is WebsiteInfo {
  if (!value || typeof value !== "object") return false;
  const info = value as Partial<WebsiteInfo>;
  return (
    typeof info.siteName === "string" &&
    typeof info.tagline === "string" &&
    typeof info.supportEmail === "string" &&
    typeof info.contactEmail === "string" &&
    typeof info.contactPhone === "string" &&
    typeof info.contactAddress === "string" &&
    typeof info.websiteUrl === "string" &&
    typeof info.facebookUrl === "string" &&
    typeof info.linkedinUrl === "string" &&
    typeof info.xUrl === "string" &&
    typeof info.logoUploaded === "boolean"
  );
}

function getApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  const message = payload.message;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join(", ");
  }
  return null;
}

export default function DashboardWebsiteSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("payment");
  const [settings, setSettings] = useState<WebsiteSettingsStatus | null>(null);
  const [websiteForm, setWebsiteForm] = useState<WebsiteInfo | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  useToastOnChange(error);
  useToastOnChange(backupError);

  useEffect(() => {
    let isCurrent = true;
    async function loadSettings() {
      setIsLoading(true);
      setError("");
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError(
          "Sign in with a super-admin account to view website settings.",
        );
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/admin/website-settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load website settings (HTTP ${response.status}).`,
          );
        }
        if (!isWebsiteSettingsStatus(payload)) {
          throw new Error(
            "The website settings service returned an invalid response.",
          );
        }
        if (isCurrent) {
          setSettings(payload);
          setWebsiteForm(payload.websiteInfo);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load website settings. Please try again.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    void loadSettings();
    return () => {
      isCurrent = false;
    };
  }, [loadAttempt]);

  function updateWebsiteField(
    field: Exclude<keyof WebsiteInfo, "logoUploaded">,
    value: string,
  ) {
    setWebsiteForm((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  async function saveWebsiteInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !websiteForm || isSavingWebsite) return;
    setIsSavingWebsite(true);
    try {
      const response = await fetch("/api/admin/website-info", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(websiteForm),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save website information (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("websiteInfo" in payload) ||
        !isWebsiteInfo(payload.websiteInfo)
      ) {
        throw new Error(
          "The website settings service returned invalid information.",
        );
      }
      const savedWebsiteInfo = payload.websiteInfo;
      setWebsiteForm(savedWebsiteInfo);
      setSettings((current) =>
        current ? { ...current, websiteInfo: savedWebsiteInfo } : current,
      );
      window.dispatchEvent(new Event("darobooks:website-info-updated"));
      showToast("Website information saved.");
    } catch (saveError) {
      showToast(
        saveError instanceof Error
          ? saveError.message
          : "Could not save website information. Please try again.",
        "error",
      );
    } finally {
      setIsSavingWebsite(false);
    }
  }

  async function downloadDatabaseBackup() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isDownloadingBackup) return;
    setIsDownloadingBackup(true);
    setBackupError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database-backup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not create database backup (HTTP ${response.status}).`,
        );
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("The database backup was empty.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `darobooks-postgresql-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.sql`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      showToast("Database backup downloaded.", "success");
    } catch (downloadError) {
      setBackupError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not create the database backup. Please try again.",
      );
    } finally {
      setIsDownloadingBackup(false);
    }
  }

  async function saveWebsiteLogo() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !logoFile || isSavingLogo) return;
    if (
      logoFile.size > 1_048_576 ||
      !["image/png", "image/jpeg", "image/webp"].includes(logoFile.type)
    ) {
      showToast(
        "Choose a PNG, JPEG, or WebP logo no larger than 1 MB.",
        "error",
      );
      return;
    }

    setIsSavingLogo(true);
    try {
      const dataUrl = await readFileAsDataUrl(logoFile);
      const commaIndex = dataUrl.indexOf(",");
      if (commaIndex < 0) {
        throw new Error("Could not read the selected logo file.");
      }
      const response = await fetch("/api/admin/website-info/logo", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mimeType: logoFile.type,
          data: dataUrl.slice(commaIndex + 1),
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not upload the website logo (HTTP ${response.status}).`,
        );
      }
      setSettings((current) =>
        current
          ? {
              ...current,
              websiteInfo: { ...current.websiteInfo, logoUploaded: true },
            }
          : current,
      );
      setWebsiteForm((current) =>
        current ? { ...current, logoUploaded: true } : current,
      );
      setLogoVersion(Date.now());
      setLogoFile(null);
      window.dispatchEvent(new Event("darobooks:website-info-updated"));
      showToast("Website logo uploaded.");
    } catch (uploadError) {
      showToast(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the website logo. Please try again.",
        "error",
      );
    } finally {
      setIsSavingLogo(false);
    }
  }

  async function removeWebsiteLogo() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingLogo) return;
    setIsSavingLogo(true);
    try {
      const response = await fetch("/api/admin/website-info/logo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not remove the website logo (HTTP ${response.status}).`,
        );
      }
      setSettings((current) =>
        current
          ? {
              ...current,
              websiteInfo: { ...current.websiteInfo, logoUploaded: false },
            }
          : current,
      );
      setWebsiteForm((current) =>
        current ? { ...current, logoUploaded: false } : current,
      );
      setLogoFile(null);
      window.dispatchEvent(new Event("darobooks:website-info-updated"));
      showToast("Website logo removed.");
    } catch (removeError) {
      showToast(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove the website logo. Please try again.",
        "error",
      );
    } finally {
      setIsSavingLogo(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1e4fc1]">
          Super admin
        </p>
        <h1 className="mt-1 text-xl font-bold text-[#10213c]">
          Website settings
        </h1>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-600">
          Review the server-side configuration used for payment collection and
          transactional email.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Website settings categories"
        className="flex gap-2 border-b border-[#e1e8f4]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "payment"}
          aria-controls="website-settings-panel"
          onClick={() => setActiveTab("payment")}
          className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
            activeTab === "payment"
              ? "border-[#1e4fc1] text-[#1e4fc1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Payment gateway
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "email"}
          aria-controls="website-settings-panel"
          onClick={() => setActiveTab("email")}
          className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
            activeTab === "email"
              ? "border-[#1e4fc1] text-[#1e4fc1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Email settings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "backup"}
          aria-controls="website-settings-panel"
          onClick={() => setActiveTab("backup")}
          className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
            activeTab === "backup"
              ? "border-[#1e4fc1] text-[#1e4fc1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Database backup
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "website"}
          aria-controls="website-settings-panel"
          onClick={() => setActiveTab("website")}
          className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
            activeTab === "website"
              ? "border-[#1e4fc1] text-[#1e4fc1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Website info
        </button>
      </div>

      {isLoading ? (
        <DashboardLoading />
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : settings ? (
        <div
          id="website-settings-panel"
          role="tabpanel"
          aria-label={
            activeTab === "payment"
              ? "Payment gateway settings"
              : activeTab === "email"
                ? "Email settings"
                : activeTab === "backup"
                  ? "Database backup status"
                  : "Website information"
          }
        >
          {activeTab === "payment" ? (
            <SettingsCard
              title="Payment gateways"
              description="Configured providers are available during plan checkout."
              configured={settings.paymentGateways.some(
                (gateway) => gateway.configured,
              )}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {settings.paymentGateways.map((gateway) => (
                  <div
                    key={gateway.provider}
                    className="rounded-lg border border-[#edf1f7] p-3"
                  >
                    <h3 className="text-[11px] font-bold text-[#10213c]">
                      {gateway.name}
                    </h3>
                    <StatusRow
                      label="Connection"
                      value={
                        gateway.configured ? "Configured" : "Not configured"
                      }
                      isReady={gateway.configured}
                    />
                    <StatusRow
                      label="Environment"
                      value={formatEnvironment(gateway.environment)}
                      isReady={gateway.environment !== "not_configured"}
                    />
                    <ConfigurationHint>
                      {gateway.provider === "paystack" ? (
                        <>
                          Configure <code>PAYSTACK_SECRET_KEY</code>.
                        </>
                      ) : gateway.provider === "flutterwave" ? (
                        <>
                          Configure <code>FLW_SECRET_KEY</code>; optionally set{" "}
                          <code>FLUTTERWAVE_ENVIRONMENT</code> to test or live.
                        </>
                      ) : gateway.provider === "paypal" ? (
                        <>
                          Configure <code>PAYPAL_CLIENT_ID</code>,{" "}
                          <code>PAYPAL_CLIENT_SECRET</code>, and{" "}
                          <code>PAYPAL_ENVIRONMENT</code> (sandbox or live).
                        </>
                      ) : (
                        <>
                          Configure <code>STRIPE_SECRET_KEY</code>.
                        </>
                      )}{" "}
                      Credentials stay in the backend environment.
                    </ConfigurationHint>
                  </div>
                ))}
              </div>
            </SettingsCard>
          ) : activeTab === "email" ? (
            <SettingsCard
              title={emailProviderName(settings.email.provider)}
              description="Used for verification, account recovery, and invoice emails."
              configured={settings.email.configured}
            >
              <StatusRow
                label="Email provider"
                value={emailProviderName(settings.email.provider)}
                isReady={
                  settings.email.provider === "resend" ||
                  settings.email.provider === "smtp"
                }
              />
              <StatusRow
                label="Sender address"
                value={
                  settings.email.fromAddressConfigured
                    ? "Configured"
                    : "Not configured"
                }
                isReady={settings.email.fromAddressConfigured}
              />
              {settings.email.provider === "smtp" ? (
                <>
                  <StatusRow
                    label="SMTP host"
                    value={
                      settings.email.smtpHostConfigured
                        ? "Configured"
                        : "Not configured"
                    }
                    isReady={settings.email.smtpHostConfigured}
                  />
                  <StatusRow
                    label="SMTP credentials"
                    value={
                      settings.email.smtpCredentialsConfigured
                        ? "Configured"
                        : "Not configured"
                    }
                    isReady={settings.email.smtpCredentialsConfigured}
                  />
                </>
              ) : settings.email.provider === "resend" ? (
                <StatusRow
                  label="Provider API key"
                  value={
                    settings.email.apiKeyConfigured
                      ? "Configured"
                      : "Not configured"
                  }
                  isReady={settings.email.apiKeyConfigured}
                />
              ) : (
                <ConfigurationHint>
                  Set <code>MAIL_PROVIDER</code> to <code>resend</code> or{" "}
                  <code>smtp</code> in the backend environment.
                </ConfigurationHint>
              )}
              <ConfigurationHint>
                Update <code>MAIL_PROVIDER</code>, <code>EMAIL_FROM</code>, and
                the required Resend or SMTP credentials in the backend service
                environment. Secret values are not available in the dashboard.
              </ConfigurationHint>
            </SettingsCard>
          ) : activeTab === "backup" ? (
            <div className="max-w-3xl rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm sm:p-5">
              <div className="border-b border-[#edf1f7] pb-4">
                <h2 className="text-sm font-bold text-[#10213c]">
                  Database backup
                </h2>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                  Create a full PostgreSQL SQL dump for an on-demand backup. The
                  backup is streamed to your browser and is not retained by
                  DaroBooks.
                </p>
              </div>
              <div className="divide-y divide-[#edf1f7]">
                <StatusRow
                  label="Database connection"
                  value={
                    settings.databaseBackup.databaseConnected
                      ? "Connected"
                      : "Unavailable"
                  }
                  isReady={settings.databaseBackup.databaseConnected}
                />
                <StatusRow
                  label="Manual backup tool"
                  value={
                    settings.databaseBackup.manualBackupAvailable
                      ? "pg_dump available"
                      : "pg_dump unavailable"
                  }
                  isReady={settings.databaseBackup.manualBackupAvailable}
                />
              </div>
              {backupError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
                >
                  {backupError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void downloadDatabaseBackup()}
                disabled={
                  isDownloadingBackup ||
                  !settings.databaseBackup.manualBackupAvailable
                }
                className="mt-4 rounded-lg bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloadingBackup ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Preparing database backup" /> Creating
                    backup…
                  </span>
                ) : (
                  "Download SQL backup"
                )}
              </button>
              <ConfigurationHint>
                The backend host must have <code>pg_dump</code> installed and
                available on its PATH. Set <code>PG_DUMP_PATH</code> if it is
                installed elsewhere. Automated backups and retention remain the
                responsibility of your PostgreSQL host. Store downloaded backups
                securely and test restores separately.
              </ConfigurationHint>
            </div>
          ) : websiteForm ? (
            <WebsiteInfoEditor
              info={websiteForm}
              logoFile={logoFile}
              logoVersion={logoVersion}
              isSavingWebsite={isSavingWebsite}
              isSavingLogo={isSavingLogo}
              onFieldChange={updateWebsiteField}
              onSave={saveWebsiteInfo}
              onLogoFileChange={setLogoFile}
              onUploadLogo={() => void saveWebsiteLogo()}
              onRemoveLogo={() => void removeWebsiteLogo()}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SettingsCard({
  title,
  description,
  configured,
  children,
}: {
  title: string;
  description: string;
  configured: boolean;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1f7] pb-4">
        <div>
          <h2 className="text-sm font-bold text-[#10213c]">{title}</h2>
          <p className="mt-1 text-[10px] text-slate-600">{description}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
            configured
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {configured ? "Ready" : "Action required"}
        </span>
      </div>
      <div className="divide-y divide-[#edf1f7]">{children}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  isReady,
}: {
  label: string;
  value: string;
  isReady: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-[10px]">
      <span className="text-slate-600">{label}</span>
      <span
        className={
          isReady
            ? "font-semibold text-emerald-700"
            : "font-medium text-amber-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function ConfigurationHint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg bg-[#f4f7fd] p-3 text-[10px] leading-relaxed text-slate-600">
      {children}
    </p>
  );
}

function WebsiteInfoEditor({
  info,
  logoFile,
  logoVersion,
  isSavingWebsite,
  isSavingLogo,
  onFieldChange,
  onSave,
  onLogoFileChange,
  onUploadLogo,
  onRemoveLogo,
}: {
  info: WebsiteInfo;
  logoFile: File | null;
  logoVersion: number;
  isSavingWebsite: boolean;
  isSavingLogo: boolean;
  onFieldChange: (
    field: Exclude<keyof WebsiteInfo, "logoUploaded">,
    value: string,
  ) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onLogoFileChange: (file: File | null) => void;
  onUploadLogo: () => void;
  onRemoveLogo: () => void;
}) {
  const fields: {
    name: Exclude<keyof WebsiteInfo, "logoUploaded">;
    label: string;
    type?: string;
    maxLength: number;
  }[] = [
    { name: "siteName", label: "Website name", maxLength: 120 },
    { name: "tagline", label: "Tagline", maxLength: 180 },
    {
      name: "supportEmail",
      label: "Support email",
      type: "email",
      maxLength: 254,
    },
    {
      name: "contactEmail",
      label: "Contact email",
      type: "email",
      maxLength: 254,
    },
    { name: "contactPhone", label: "Contact phone", maxLength: 40 },
    { name: "contactAddress", label: "Contact address", maxLength: 240 },
    {
      name: "websiteUrl",
      label: "Website URL",
      type: "url",
      maxLength: 240,
    },
    {
      name: "facebookUrl",
      label: "Facebook URL",
      type: "url",
      maxLength: 240,
    },
    {
      name: "linkedinUrl",
      label: "LinkedIn URL",
      type: "url",
      maxLength: 240,
    },
    { name: "xUrl", label: "X URL", type: "url", maxLength: 240 },
  ];

  return (
    <div className="grid max-w-4xl gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <form
        onSubmit={onSave}
        className="rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[#10213c]">
            Public website information
          </h2>
          <p className="mt-1 text-[10px] text-slate-600">
            These details are shown on the public website.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className={`block text-[10px] font-semibold text-slate-700 ${
                field.name === "tagline" || field.name === "contactAddress"
                  ? "sm:col-span-2"
                  : ""
              }`}
            >
              {field.label}
              <input
                type={field.type ?? "text"}
                maxLength={field.maxLength}
                required={
                  field.name === "siteName" || field.name === "supportEmail"
                }
                value={info[field.name]}
                onChange={(event) =>
                  onFieldChange(field.name, event.currentTarget.value)
                }
                className={websiteFieldClass}
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={isSavingWebsite}
          className="mt-4 rounded-lg bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isSavingWebsite ? (
            <span className="inline-flex items-center gap-2">
              <ActionSpinner label="Saving website information" /> Saving...
            </span>
          ) : (
            "Save website information"
          )}
        </button>
      </form>

      <div className="h-fit rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#10213c]">Website logo</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
          Upload a PNG, JPEG, or WebP image up to 1 MB. The image is stored in
          the database and used on public pages.
        </p>
        {info.logoUploaded && (
          <Image
            key={logoVersion}
            src={`${API_BASE_URL}/website-info/logo?v=${logoVersion}`}
            alt={`${info.siteName} logo`}
            width={200}
            height={80}
            unoptimized
            className="my-3 h-16 w-[200px] max-w-full object-contain"
          />
        )}
        <label className="mt-3 block text-[10px] font-semibold text-slate-700">
          Select image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) =>
              onLogoFileChange(event.currentTarget.files?.[0] ?? null)
            }
            className="mt-1 block w-full text-[10px] file:mr-2 file:rounded-md file:border-0 file:bg-[#edf3ff] file:px-2 file:py-1.5 file:text-[10px] file:font-semibold file:text-[#1e4fc1]"
          />
        </label>
        {logoFile && (
          <p className="mt-2 break-all text-[9px] text-slate-500">
            {logoFile.name}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUploadLogo}
            disabled={!logoFile || isSavingLogo}
            className="rounded-lg bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingLogo ? (
              <span className="inline-flex items-center gap-2">
                <ActionSpinner label="Uploading website logo" /> Working...
              </span>
            ) : (
              "Upload logo"
            )}
          </button>
          {info.logoUploaded && (
            <button
              type="button"
              onClick={onRemoveLogo}
              disabled={isSavingLogo}
              className="rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the selected logo file."));
      }
    });
    reader.addEventListener("error", () => {
      reject(new Error("Could not read the selected logo file."));
    });
    reader.readAsDataURL(file);
  });
}

function emailProviderName(provider: string): string {
  if (provider === "resend") return "Resend";
  if (provider === "smtp") return "SMTP";
  return `Unsupported (${provider})`;
}

function formatEnvironment(
  environment: WebsiteSettingsStatus["paymentGateway"]["environment"],
): string {
  if (environment === "test") return "Test";
  if (environment === "live") return "Live";
  if (environment === "unknown") return "Unrecognized key format";
  return "Not configured";
}
