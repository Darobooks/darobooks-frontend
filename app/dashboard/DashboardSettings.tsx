"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiDownloadLine,
  RiHistoryLine,
  RiLock2Line,
  RiShieldCheckLine,
  RiUploadLine,
  RiUser3Line,
} from "@remixicon/react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import ActionSpinner from "../components/ActionSpinner";
import { useToastOnChange } from "@/app/components/toast";
import { getTenantBaseDomain } from "@/app/tenant-domain";
import DashboardLoading from "./DashboardLoading";
import { PlanDescription } from "../pricing/PlanDescription";

type User = {
  fullName: string;
  email: string;
  isSuperAdmin: boolean;
  twoStepEnabled: boolean;
  features: string[];
  planFeatures: string[];
  planKey: string;
};
type Workspace = {
  businessName: string;
  countryCode: string | null;
  currencyCode: string | null;
  tenantUrl: string | null;
};
type TaxSettings = { vatRate: number; whtRate: number };
type InvoiceTemplate = "classic" | "modern" | "minimal";
type InvoiceSettings = {
  companyAddress: string;
  taxId: string;
  bankDetails: string;
  paymentInstructions: string;
  accentColor: string;
  footerText: string;
  logoDataUrl: string | null;
  template: InvoiceTemplate;
  showWatermark: boolean;
  canRemoveWatermark: boolean;
};
type WorkspaceUrlSettings = {
  tenantSlug: string | null;
  tenantUrl: string | null;
  canChange: boolean;
};

type Activity = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
};
type TeamMember = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  roleName: string;
  teamName: string | null;
  emailVerified: boolean;
};
type BillingPlan = {
  key: string;
  name: string;
  audience: string;
  features: string[];
  usersLimit: number | null;
  companyLimit: number | null;
  discountPercent: number;
  monthlyAmount: number | null;
};
type PaymentProvider = "paystack" | "flutterwave" | "paypal" | "stripe";
type BillingData = {
  currency: "USD" | "NGN" | "INR";
  generalDiscountPercent: number;
  paymentProviders: { provider: PaymentProvider; name: string }[];
  plans: BillingPlan[];
  subscription: {
    plan: string;
    billingInterval: "monthly" | "yearly" | null;
    currency: string | null;
    amountMinor: number | null;
    endsAt: string | null;
  };
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "GHS",
  "ZAR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "INR",
  "AED",
  "SAR",
  "CHF",
  "SGD",
  "NZD",
];

const tabs = [
  "Security",
  "Team and roles",
  "Audit trail",
  "Tax settings",
  "e-Invoicing setup",
  "Company and invoice look",
  "Company URL",
  "Region and currency",
  "Plan and billing",
  "Your data",
] as const;

type SettingsTab = (typeof tabs)[number];

const SETTINGS_TAB_FEATURES: Partial<Record<SettingsTab, string>> = {
  "Team and roles": "teams",
  "Tax settings": "tax-center",
  "e-Invoicing setup": "e-invoicing",
};

function getSettingsTabDisabledReason(
  tab: SettingsTab,
  user: User | null,
): string | null {
  if (!user || user.isSuperAdmin) return null;
  if (tab === "Company URL" && user.planKey === "free") {
    return "Company URL customization is available on paid plans. Review plans to unlock it.";
  }
  const requiredFeature = SETTINGS_TAB_FEATURES[tab];
  if (!requiredFeature || user.features.includes(requiredFeature)) return null;
  if (!user.planFeatures.includes(requiredFeature)) {
    return `Your current plan does not include ${tab}. Review plans to unlock it.`;
  }
  return `Your role does not have access to ${tab}. Ask your workspace owner for access.`;
}

export default function DashboardSettings({
  user,
  workspace,
  isSavingWorkspace,
  error,
  onSaveWorkspace,
  onCompanyLogoChange,
  taxSettings,
  onTaxSettingsSaved,
  initialTab = "Team and roles",
}: {
  user: User | null;
  workspace: Workspace | null;
  isSavingWorkspace: boolean;
  error: string;
  onCompanyLogoChange: (logoDataUrl: string | null) => void;
  onSaveWorkspace: (workspace: {
    businessName: string;
    countryCode: string | null;
    currencyCode: string | null;
  }) => Promise<void>;
  taxSettings: TaxSettings;
  onTaxSettingsSaved: (settings: TaxSettings) => void;
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    getSettingsTabDisabledReason(initialTab, user) ? "Security" : initialTab,
  );
  const canAccessTeams =
    !!user && (user.isSuperAdmin || user.features.includes("teams"));
  const [businessName, setBusinessName] = useState(
    workspace?.businessName ?? "",
  );
  const [countryCode, setCountryCode] = useState(workspace?.countryCode ?? "");
  const [currencyCode, setCurrencyCode] = useState(
    workspace?.currencyCode ?? "USD",
  );
  const [vatRate, setVatRate] = useState(String(taxSettings.vatRate));
  const [whtRate, setWhtRate] = useState(String(taxSettings.whtRate));
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState("");
  const [eInvoicingCountry, setEInvoicingCountry] = useState("NG");
  const [companyRegistered, setCompanyRegistered] = useState(false);
  const [testInvoicesCleared, setTestInvoicesCleared] = useState(false);
  const [providerLoaded, setProviderLoaded] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [isSavingTaxSettings, setIsSavingTaxSettings] = useState(false);
  const [taxSettingsError, setTaxSettingsError] = useState("");
  const [taxSettingsMessage, setTaxSettingsMessage] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [teamMembersError, setTeamMembersError] = useState("");
  const [teamMembersLoaded, setTeamMembersLoaded] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [paymentProvider, setPaymentProvider] =
    useState<PaymentProvider>("paystack");
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const paymentVerificationRef = useRef<string | null>(null);
  const [billingError, setBillingError] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    companyAddress: "",
    taxId: "",
    bankDetails: "",
    paymentInstructions: "",
    accentColor: "#1e4fc1",
    footerText: "",
    logoDataUrl: null,
    template: "classic",
    showWatermark: true,
    canRemoveWatermark: false,
  });
  const [invoiceSettingsLoaded, setInvoiceSettingsLoaded] = useState(false);
  const [invoiceSettingsLoadAttempt, setInvoiceSettingsLoadAttempt] =
    useState(0);
  const [isLoadingInvoiceSettings, setIsLoadingInvoiceSettings] =
    useState(false);
  const [isSavingInvoiceSettings, setIsSavingInvoiceSettings] = useState(false);
  const [invoiceSettingsError, setInvoiceSettingsError] = useState("");
  const [invoiceSettingsMessage, setInvoiceSettingsMessage] = useState("");
  const [workspaceUrl, setWorkspaceUrl] = useState<WorkspaceUrlSettings | null>(
    null,
  );
  const [workspaceUrlLoaded, setWorkspaceUrlLoaded] = useState(false);
  const [workspaceUrlError, setWorkspaceUrlError] = useState("");
  const [workspaceUrlMessage, setWorkspaceUrlMessage] = useState("");
  const [workspaceUrlSlug, setWorkspaceUrlSlug] = useState("");
  const [isSavingWorkspaceUrl, setIsSavingWorkspaceUrl] = useState(false);
  const [isOpeningWorkspaceUrl, setIsOpeningWorkspaceUrl] = useState(false);
  const [businessDataError, setBusinessDataError] = useState("");
  const [businessDataMessage, setBusinessDataMessage] = useState("");
  const [isExportingBusinessData, setIsExportingBusinessData] = useState(false);
  const [isImportingBusinessData, setIsImportingBusinessData] = useState(false);
  useToastOnChange(error);
  useToastOnChange(taxSettingsError);
  useToastOnChange(activityError);
  useToastOnChange(teamMembersError);
  useToastOnChange(billingError);
  useToastOnChange(invoiceSettingsError);
  useToastOnChange(workspaceUrlError);
  useToastOnChange(businessDataError);
  useToastOnChange(taxSettingsMessage, "success");
  useToastOnChange(billingMessage, "success");
  useToastOnChange(invoiceSettingsMessage, "success");
  useToastOnChange(businessDataMessage, "success");

  useEffect(() => {
    if (activeTab !== "e-Invoicing setup" || providerLoaded) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    const loadProvider = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/e-invoicing`, {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          taxIdentificationNumber?: string | null;
          countryCode?: string;
          readiness?: {
            systemConfigured: boolean;
            companyRegistered: boolean;
            testInvoicesCleared: boolean;
          };
          message?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.message ?? "Could not load provider settings.",
          );
        setTaxIdentificationNumber(payload.taxIdentificationNumber ?? "");
        setEInvoicingCountry(payload.countryCode ?? "NG");
        setCompanyRegistered(payload.readiness?.companyRegistered ?? false);
        setTestInvoicesCleared(payload.readiness?.testInvoicesCleared ?? false);
        setProviderLoaded(true);
      } catch (loadError) {
        setInvoiceSettingsError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load provider settings.",
        );
      }
    };
    void loadProvider();
  }, [activeTab, providerLoaded]);

  async function saveProviderConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setInvoiceSettingsError("Sign in again to save provider settings.");
      return;
    }
    setProviderSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/e-invoicing/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            countryCode: eInvoicingCountry,
            taxIdentificationNumber,
            companyRegistered,
            testInvoicesCleared,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Could not save provider settings.");
      setInvoiceSettingsMessage(payload.message ?? "Provider settings saved.");
    } catch (saveError) {
      setInvoiceSettingsError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save provider settings.",
      );
    } finally {
      setProviderSaving(false);
    }
  }

  useEffect(() => {
    if (!taxSettingsMessage) return;
    const timeout = window.setTimeout(() => setTaxSettingsMessage(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [taxSettingsMessage]);

  useEffect(() => {
    if (activeTab !== "Company and invoice look" || invoiceSettingsLoaded) {
      return;
    }
    let isCurrent = true;
    async function loadInvoiceSettings() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setInvoiceSettingsError("Sign in again to manage invoice branding.");
        return;
      }
      setIsLoadingInvoiceSettings(true);
      setInvoiceSettingsError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/invoice-settings`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load invoice settings (HTTP ${response.status}).`,
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("settings" in payload) ||
          !isInvoiceSettings(payload.settings)
        ) {
          throw new Error(
            "The invoice settings service returned invalid data.",
          );
        }
        if (isCurrent) {
          setInvoiceSettings(payload.settings);
          onCompanyLogoChange(payload.settings.logoDataUrl);
          setInvoiceSettingsLoaded(true);
        }
      } catch (loadError) {
        if (isCurrent) {
          setInvoiceSettingsError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load invoice settings. Please try again.",
          );
        }
      } finally {
        if (isCurrent) setIsLoadingInvoiceSettings(false);
      }
    }
    void loadInvoiceSettings();
    return () => {
      isCurrent = false;
    };
  }, [
    activeTab,
    invoiceSettingsLoadAttempt,
    invoiceSettingsLoaded,
    onCompanyLogoChange,
  ]);

  useEffect(() => {
    if (activeTab !== "Plan and billing" || billingLoaded) return;
    let isCurrent = true;

    async function loadBilling() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setBillingError("Sign in again to view plans and billing.");
        setBillingLoaded(true);
        return;
      }
      setIsLoadingBilling(true);
      setBillingError("");
      try {
        const query = new URLSearchParams(window.location.search);
        const reference =
          query.get("reference") ?? query.get("trxref") ?? query.get("tx_ref");
        const providerPaymentId =
          query.get("transaction_id") ??
          query.get("token") ??
          query.get("session_id");
        if (reference && paymentVerificationRef.current !== reference) {
          paymentVerificationRef.current = reference;
          const verification = await fetch(`${API_BASE_URL}/billing/verify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reference, providerPaymentId }),
          });
          const verificationPayload: unknown = await verification.json();
          if (!verification.ok) {
            throw new Error(
              getApiErrorMessage(verificationPayload) ??
                `Could not verify payment (HTTP ${verification.status}).`,
            );
          }
          setBillingMessage(
            getApiErrorMessage(verificationPayload) ??
              "Payment verified and your plan is active.",
          );
          const cleanedUrl = new URL(window.location.href);
          cleanedUrl.searchParams.delete("reference");
          cleanedUrl.searchParams.delete("trxref");
          cleanedUrl.searchParams.delete("tx_ref");
          cleanedUrl.searchParams.delete("transaction_id");
          cleanedUrl.searchParams.delete("token");
          cleanedUrl.searchParams.delete("session_id");
          cleanedUrl.searchParams.delete("payment");
          window.history.replaceState({}, "", cleanedUrl.toString());
        }

        const response = await fetch(`${API_BASE_URL}/billing/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load plans (HTTP ${response.status}).`,
          );
        }
        if (!isBillingData(payload)) {
          throw new Error("The billing service returned an invalid response.");
        }
        if (isCurrent) {
          setBillingData(payload);
          if (payload.paymentProviders.length) {
            setPaymentProvider(payload.paymentProviders[0].provider);
          }
          setBillingLoaded(true);
        }
      } catch (loadError) {
        if (isCurrent) {
          setBillingError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load billing. Please try again.",
          );
          setBillingLoaded(true);
        }
      } finally {
        if (isCurrent) setIsLoadingBilling(false);
      }
    }
    void loadBilling();
    return () => {
      isCurrent = false;
    };
  }, [activeTab, billingLoaded]);

  useEffect(() => {
    if (activeTab !== "Company URL" || workspaceUrlLoaded) return;
    let isCurrent = true;
    async function loadWorkspaceUrl() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setWorkspaceUrlError("Sign in again to manage your company URL.");
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/workspace-url`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load company URL (HTTP ${response.status}).`,
          );
        }
        if (!isWorkspaceUrlSettings(payload)) {
          throw new Error("The company URL service returned invalid data.");
        }
        if (isCurrent) {
          setWorkspaceUrl(payload);
          setWorkspaceUrlSlug(payload.tenantSlug ?? "");
          setWorkspaceUrlLoaded(true);
          setWorkspaceUrlError("");
        }
      } catch (loadError) {
        if (isCurrent) {
          setWorkspaceUrlError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load company URL. Please try again.",
          );
        }
      }
    }
    void loadWorkspaceUrl();
    return () => {
      isCurrent = false;
    };
  }, [activeTab, workspaceUrlLoaded]);

  async function startCheckout(plan: BillingPlan) {
    if (plan.key === "free") return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || checkoutPlan) return;
    setCheckoutPlan(plan.key);
    setBillingError("");
    try {
      const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: plan.key,
          billingInterval: billingPeriod,
          provider: paymentProvider,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not start checkout (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("authorizationUrl" in payload) ||
        typeof payload.authorizationUrl !== "string" ||
        !payload.authorizationUrl.startsWith("https://")
      ) {
        throw new Error(
          "The billing service returned an invalid checkout URL.",
        );
      }
      window.location.assign(payload.authorizationUrl);
    } catch (checkoutError) {
      setBillingError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start checkout. Please try again.",
      );
      setCheckoutPlan(null);
    }
  }

  async function saveTaxSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingTaxSettings) return;
    const rates = { vatRate: Number(vatRate), whtRate: Number(whtRate) };
    if (
      Object.values(rates).some(
        (rate) =>
          !Number.isFinite(rate) ||
          rate < 0 ||
          rate > 100 ||
          Math.round(rate * 100) !== rate * 100,
      )
    ) {
      setTaxSettingsError(
        "Enter VAT and WHT rates between 0 and 100, with up to two decimal places.",
      );
      setTaxSettingsMessage("");
      return;
    }
    setIsSavingTaxSettings(true);
    setTaxSettingsError("");
    setTaxSettingsMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/tax-settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rates),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save tax settings (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("taxSettings" in payload) ||
        !isTaxSettings(payload.taxSettings)
      ) {
        throw new Error("The settings service returned invalid tax settings.");
      }
      setVatRate(String(payload.taxSettings.vatRate));
      setWhtRate(String(payload.taxSettings.whtRate));
      onTaxSettingsSaved(payload.taxSettings);
      setTaxSettingsMessage("VAT and WHT settings were saved.");
    } catch (saveError) {
      setTaxSettingsError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save tax settings. Please try again.",
      );
    } finally {
      setIsSavingTaxSettings(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "Audit trail" || activityLoaded) return;

    let isCurrent = true;
    async function loadActivity() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setActivityError("Sign in again to view your activity.");
        setActivityLoaded(true);
        return;
      }

      setIsLoadingActivity(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load activity (HTTP ${response.status}).`,
          );
        }
        if (!isActivityResponse(payload)) {
          throw new Error("The activity service returned an invalid response.");
        }
        if (isCurrent) {
          setActivities(payload.activities);
          setActivityError("");
          setActivityLoaded(true);
        }
      } catch (loadError) {
        if (isCurrent) {
          setActivityError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load activity. Please try again.",
          );
          setActivityLoaded(true);
        }
      } finally {
        if (isCurrent) setIsLoadingActivity(false);
      }
    }

    void loadActivity();
    return () => {
      isCurrent = false;
    };
  }, [activeTab, activityLoaded]);

  useEffect(() => {
    if (
      activeTab !== "Team and roles" ||
      teamMembersLoaded ||
      !canAccessTeams
    ) {
      return;
    }

    let isCurrent = true;
    async function loadTeamMembers() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setTeamMembersError("Sign in again to view your team members.");
        setTeamMembersLoaded(true);
        return;
      }

      setIsLoadingTeamMembers(true);
      setTeamMembersError("");
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/teams`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load team members (HTTP ${response.status}).`,
          );
        }
        if (!isTeamMembersResponse(payload)) {
          throw new Error("The team service returned invalid member data.");
        }
        if (isCurrent) {
          setTeamMembers(payload.users);
          setTeamMembersLoaded(true);
        }
      } catch (loadError) {
        if (isCurrent) {
          setTeamMembersError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load team members. Please try again.",
          );
          setTeamMembersLoaded(true);
        }
      } finally {
        if (isCurrent) setIsLoadingTeamMembers(false);
      }
    }

    void loadTeamMembers();
    return () => {
      isCurrent = false;
    };
  }, [activeTab, canAccessTeams, teamMembersLoaded]);

  const submitWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSaveWorkspace({
      businessName,
      countryCode: countryCode.trim() || null,
      currencyCode: currencyCode.trim() || null,
    });
  };

  async function saveInvoiceSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingInvoiceSettings) return;
    setIsSavingInvoiceSettings(true);
    setInvoiceSettingsError("");
    setInvoiceSettingsMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/invoice-settings`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyAddress: invoiceSettings.companyAddress,
            taxId: invoiceSettings.taxId,
            bankDetails: invoiceSettings.bankDetails,
            paymentInstructions: invoiceSettings.paymentInstructions,
            accentColor: invoiceSettings.accentColor,
            footerText: invoiceSettings.footerText,
            logoDataUrl: invoiceSettings.logoDataUrl,
            template: invoiceSettings.template,
            showWatermark: invoiceSettings.showWatermark,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save invoice settings (HTTP ${response.status}).`,
        );
      }
      setInvoiceSettingsMessage(
        getApiErrorMessage(payload) ?? "Invoice branding was saved.",
      );
    } catch (saveError) {
      setInvoiceSettingsError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save invoice branding. Please try again.",
      );
    } finally {
      setIsSavingInvoiceSettings(false);
    }
  }

  async function saveWorkspaceUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingWorkspaceUrl) {
      if (!token)
        setWorkspaceUrlError("Sign in again to save your company URL.");
      return;
    }

    setIsSavingWorkspaceUrl(true);
    setWorkspaceUrlError("");
    setWorkspaceUrlMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/workspace-url`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenantSlug: workspaceUrlSlug }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save company URL (HTTP ${response.status}).`,
        );
      }
      if (!isWorkspaceUrlSettings(payload)) {
        throw new Error("The company URL service returned invalid data.");
      }
      if (!payload.tenantUrl) {
        throw new Error("The company URL service returned no login address.");
      }
      const tenantUrl = new URL(payload.tenantUrl);
      if (tenantUrl.protocol !== "https:" && tenantUrl.protocol !== "http:") {
        throw new Error(
          "The company URL service returned an invalid login address.",
        );
      }
      if (payload.tenantSlug === workspaceUrl?.tenantSlug) {
        setWorkspaceUrlMessage("Your company URL is unchanged.");
        return;
      }
      setWorkspaceUrl(payload);
      window.sessionStorage.removeItem("darobooksAccessToken");
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith("darobooksDashboardHome:"))
        .forEach((key) => window.sessionStorage.removeItem(key));
      window.location.assign(new URL("/login", tenantUrl).toString());
      return;
    } catch (saveError) {
      setWorkspaceUrlError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save company URL. Please try again.",
      );
    } finally {
      setIsSavingWorkspaceUrl(false);
    }
  }

  async function openWorkspaceUrl(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!workspaceUrl?.tenantUrl || !workspaceUrl.tenantSlug) return;
    if (isOpeningWorkspaceUrl) return;

    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setWorkspaceUrlError("Sign in again to open your company URL.");
      return;
    }

    setIsOpeningWorkspaceUrl(true);
    setWorkspaceUrlError("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/tenant-handoff`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not open company URL (HTTP ${response.status}).`,
        );
      }
      if (
        !isTenantHandoffResponse(payload) ||
        payload.tenantSlug !== workspaceUrl.tenantSlug
      ) {
        throw new Error("The sign-in service returned an invalid handoff.");
      }

      const tenantUrl = new URL(workspaceUrl.tenantUrl);
      if (
        (tenantUrl.protocol !== "https:" && tenantUrl.protocol !== "http:") ||
        tenantUrl.hostname !==
          `${payload.tenantSlug}.${getTenantBaseDomain(
            window.location.hostname,
          )}`
      ) {
        throw new Error("The company URL service returned an invalid address.");
      }
      tenantUrl.pathname = "/";
      tenantUrl.search = "";
      tenantUrl.hash = new URLSearchParams({
        "tenant-handoff": payload.handoffToken,
      }).toString();
      window.location.assign(tenantUrl.toString());
    } catch (openError) {
      setWorkspaceUrlError(
        openError instanceof TypeError
          ? "Could not reach the sign-in service. Check your connection and try again."
          : openError instanceof Error
            ? openError.message
            : "Could not open your company URL. Please try again.",
      );
    } finally {
      setIsOpeningWorkspaceUrl(false);
    }
  }

  async function selectInvoiceLogo(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setInvoiceSettingsError("Choose a PNG, JPEG, or WebP logo.");
      return;
    }
    if (file.size > 1_048_576) {
      setInvoiceSettingsError("The company logo must be no larger than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const logoDataUrl = reader.result;
      if (typeof logoDataUrl !== "string") {
        setInvoiceSettingsError("Could not read the selected company logo.");
        return;
      }
      setInvoiceSettings((current) => ({
        ...current,
        logoDataUrl,
      }));
      onCompanyLogoChange(logoDataUrl);
      setInvoiceSettingsError("");
    };
    reader.onerror = () =>
      setInvoiceSettingsError("Could not read the selected company logo.");
    reader.readAsDataURL(file);
  }

  async function exportBusinessData() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isExportingBusinessData) {
      if (!token) setBusinessDataError("Sign in again to export your data.");
      return;
    }
    setIsExportingBusinessData(true);
    setBusinessDataError("");
    setBusinessDataMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/data/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not export data (HTTP ${response.status}).`,
        );
      }
      if (
        !isRecord(payload) ||
        payload.format !== "darobooks-business-data" ||
        payload.version !== 1
      ) {
        throw new Error("The data export service returned an invalid file.");
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `darobooks-business-data-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setBusinessDataMessage("Your business data export is ready.");
    } catch (exportError) {
      setBusinessDataError(
        exportError instanceof Error
          ? exportError.message
          : "Could not export your data. Please try again.",
      );
    } finally {
      setIsExportingBusinessData(false);
    }
  }

  async function importBusinessData(file: File | undefined) {
    if (!file) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isImportingBusinessData) {
      if (!token) setBusinessDataError("Sign in again to import your data.");
      return;
    }
    if (file.size > 1_800_000) {
      setBusinessDataError("Choose a JSON export no larger than 1.8 MB.");
      return;
    }
    setIsImportingBusinessData(true);
    setBusinessDataError("");
    setBusinessDataMessage("");
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("The selected file is not valid JSON.");
      }
      if (
        !isRecord(data) ||
        data.format !== "darobooks-business-data" ||
        data.version !== 1
      ) {
        throw new Error(
          "Choose a DaroBooks business data export (format version 1).",
        );
      }
      const response = await fetch(`${API_BASE_URL}/dashboard/data/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not import data (HTTP ${response.status}).`,
        );
      }
      if (!isBusinessDataImportResponse(payload)) {
        throw new Error("The data import service returned an invalid result.");
      }
      const imported = payload.imported;
      setBusinessDataMessage(
        `Imported ${imported.contacts} contacts, ${imported.items} items, ${imported.invoices} invoices, ${imported.projects} projects, and ${imported.timeEntries} time entries.`,
      );
    } catch (importError) {
      setBusinessDataError(
        importError instanceof Error
          ? importError.message
          : "Could not import your data. Please try again.",
      );
    } finally {
      setIsImportingBusinessData(false);
    }
  }

  const billingPlans = billingData?.plans ?? [];

  return (
    <section aria-labelledby="dashboard-settings-heading">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id="dashboard-settings-heading"
            className="font-jakarta text-[21px] font-bold tracking-[-0.35px] text-[#10213c]"
          >
            Settings
          </h1>
          <p className="mt-1 text-[10px] text-slate-600">
            Your team, company, look, tax, plan and data.
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Settings categories"
        className="mb-4 flex gap-1.5 overflow-x-auto pb-1"
      >
        {tabs.map((tab) => {
          const disabledReason = getSettingsTabDisabledReason(tab, user);
          return (
            <button
              key={tab}
              id={`settings-tab-${tab.toLowerCase().replaceAll(" ", "-")}`}
              type="button"
              role="tab"
              disabled={!!disabledReason}
              title={disabledReason ?? tab}
              aria-label={disabledReason ? `${tab}. ${disabledReason}` : tab}
              aria-selected={activeTab === tab}
              aria-controls="settings-panel"
              onClick={() => setActiveTab(tab)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${
                disabledReason
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : activeTab === tab
                    ? "border-[#1e4fc1] bg-[#1e4fc1] text-white"
                    : "border-[#dbe4f3] bg-white text-slate-700 hover:border-[#1e4fc1] hover:text-[#1e4fc1]"
              }`}
            >
              {tab}
              {disabledReason && (
                <RiLock2Line aria-hidden="true" className="h-3 w-3" />
              )}
            </button>
          );
        })}
      </div>

      <div
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab.toLowerCase().replaceAll(" ", "-")}`}
        className="min-w-0"
      >
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
          >
            {error}
          </p>
        )}

        {activeTab === "Team and roles" && (
          <SettingsCard title="Team members">
            {!canAccessTeams ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-semibold text-amber-950">
                  Team management isn&apos;t available with your current access.
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-amber-900">
                  The Team and roles settings remain visible. Your plan or role
                  may not include this feature. Review plans to see available
                  access.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("Plan and billing")}
                  className="mt-3 rounded-md bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white"
                >
                  View plans
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    Review the people who have access to your workspace.
                  </p>
                  <Link
                    href="/dashboard/teams"
                    className="inline-flex rounded-md bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white"
                  >
                    Manage team
                  </Link>
                </div>
                {isLoadingTeamMembers ? (
                  <DashboardLoading variant="inline" />
                ) : teamMembersError ? (
                  <div>
                    <p role="alert" className="text-[10px] text-red-700">
                      {teamMembersError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamMembersLoaded(false);
                        setTeamMembersError("");
                      }}
                      className="mt-2 text-[10px] font-semibold text-[#1e4fc1] hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-[10px] text-slate-600">
                    No team members have been added yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#edf1f7] rounded-lg border border-[#edf1f7] px-3">
                    {teamMembers.map((member) => (
                      <li
                        key={`${member.companyId}-${member.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#1e4fc1]">
                            {member.fullName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-semibold text-[#10213c]">
                              {member.fullName}
                            </span>
                            <span className="block truncate text-[9px] text-slate-500">
                              {member.email}
                            </span>
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-[#f3f6fb] px-2.5 py-1 text-[9px] font-semibold text-slate-700">
                            {member.roleName}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                              member.emailVerified
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {member.emailVerified
                              ? "Active"
                              : "Invitation pending"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </SettingsCard>
        )}

        {activeTab === "Security" && (
          <SettingsCard title="Two-step verification">
            <p className="text-[10px] leading-relaxed text-slate-600">
              Use an authenticator app to add a second step when protecting
              access to your account. You can still sign in without setting it
              up.
            </p>
            <p
              role="status"
              className={`mt-3 rounded-lg px-3 py-2 text-[10px] font-semibold ${
                user?.twoStepEnabled
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              {user?.twoStepEnabled
                ? "Two-step verification is enabled."
                : "Two-step verification is not enabled."}
            </p>
            {!user?.twoStepEnabled ? (
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.removeItem("twoStepSetupToken");
                  router.push("/two-step");
                }}
                className="mt-3 rounded-md bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white"
              >
                Set up 2FA
              </button>
            ) : null}
          </SettingsCard>
        )}

        {activeTab === "Audit trail" && (
          <SettingsCard title="Recent account activity">
            {isLoadingActivity && <DashboardLoading variant="inline" />}
            {activityError && (
              <div>
                <p role="alert" className="text-[10px] text-red-700">
                  {activityError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActivityLoaded(false);
                    setActivityError("");
                  }}
                  className="mt-2 text-[10px] font-semibold text-[#1e4fc1] hover:underline"
                >
                  Try again
                </button>
              </div>
            )}
            {!isLoadingActivity &&
              !activityError &&
              activities.length === 0 && (
                <p className="text-[10px] text-slate-600">
                  No account activity has been recorded yet.
                </p>
              )}
            {activities.length > 0 && (
              <>
                <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f7f9fd] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <RiHistoryLine className="h-4 w-4 text-[#1e4fc1]" />
                    <div>
                      <p className="text-[10px] font-semibold text-[#10213c]">
                        Account history
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {activities.length} recent event
                        {activities.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="divide-y divide-[#edf1f7] rounded-lg border border-[#edf1f7] px-3">
                  {activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1e4fc1]">
                          <RiShieldCheckLine className="h-3.5 w-3.5" />
                        </span>
                        <span>
                          <span className="block text-[10px] font-semibold text-[#10213c]">
                            {activity.description}
                          </span>
                          <span className="mt-0.5 block text-[9px] text-slate-400">
                            {activity.action}
                          </span>
                        </span>
                      </div>
                      <time
                        dateTime={activity.createdAt}
                        className="text-[9px] text-slate-500"
                      >
                        {new Date(activity.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SettingsCard>
        )}

        {activeTab === "Tax settings" && (
          <SettingsCard title="Tax settings">
            <p className="mb-3 max-w-[600px] text-[10px] leading-relaxed text-slate-600">
              Set the default VAT and WHT rates used for new invoices. You can
              still enable or disable each tax on an individual invoice.
            </p>
            <p className="mb-4 text-[9px] text-slate-500">
              Current region: {workspace?.countryCode ?? "Not set"}. Confirm
              applicable rates and filing requirements with your local tax
              authority.
            </p>
            {taxSettingsError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
              >
                {taxSettingsError}
              </p>
            )}
            {taxSettingsMessage && (
              <p
                role="status"
                className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
              >
                {taxSettingsMessage}
              </p>
            )}
            <form onSubmit={saveTaxSettings} className="max-w-[520px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="settings-vat-rate"
                  className="text-[10px] font-semibold text-slate-700"
                >
                  VAT rate (%)
                  <input
                    id="settings-vat-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={vatRate}
                    onChange={(event) => setVatRate(event.target.value)}
                    className={`${fieldClassName} mt-1`}
                  />
                </label>
                <label
                  htmlFor="settings-wht-rate"
                  className="text-[10px] font-semibold text-slate-700"
                >
                  WHT rate (%)
                  <input
                    id="settings-wht-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={whtRate}
                    onChange={(event) => setWhtRate(event.target.value)}
                    className={`${fieldClassName} mt-1`}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSavingTaxSettings}
                className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSavingTaxSettings ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving tax settings" /> Saving tax
                    settings…
                  </span>
                ) : (
                  "Save tax settings"
                )}
              </button>
            </form>
          </SettingsCard>
        )}

        {activeTab === "e-Invoicing setup" && (
          <SettingsCard title="e-Invoicing setup">
            <p className="mb-4 max-w-[650px] text-[10px] leading-relaxed text-slate-600">
              Configure the tax identity and filing readiness used by the
              self-managed e-Invoicing system. No external provider is needed.
            </p>
            <form onSubmit={saveProviderConnection} className="max-w-[620px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-semibold text-slate-700">
                  Filing country
                  <select
                    value={eInvoicingCountry}
                    onChange={(event) =>
                      setEInvoicingCountry(event.target.value)
                    }
                    className={`${fieldClassName} mt-1`}
                  >
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="GH">Ghana</option>
                    <option value="IN">India</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </label>
                <label className="text-[10px] font-semibold text-slate-700">
                  Tax identification number
                  <input
                    value={taxIdentificationNumber}
                    onChange={(event) =>
                      setTaxIdentificationNumber(event.target.value)
                    }
                    className={`${fieldClassName} mt-1`}
                    placeholder="Enter tax ID"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3 text-[10px] sm:grid-cols-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={companyRegistered}
                    onChange={(event) =>
                      setCompanyRegistered(event.target.checked)
                    }
                  />
                  Company registered
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={testInvoicesCleared}
                    onChange={(event) =>
                      setTestInvoicesCleared(event.target.checked)
                    }
                  />
                  Tests cleared
                </label>
              </div>
              <button
                type="submit"
                disabled={providerSaving}
                className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-60"
              >
                {providerSaving
                  ? "Saving provider settings…"
                  : "Save provider settings"}
              </button>
            </form>
          </SettingsCard>
        )}

        {activeTab === "Company and invoice look" && (
          <SettingsCard title="Company and invoice look">
            <p className="mb-4 max-w-[650px] text-[10px] leading-relaxed text-slate-600">
              These details and visual settings appear on invoices and their PDF
              email attachments.
            </p>
            <form onSubmit={submitWorkspace} className="mb-5 max-w-[520px]">
              <label
                htmlFor="settings-company-name"
                className="text-[10px] font-semibold"
              >
                Business name
              </label>
              <input
                id="settings-company-name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
                minLength={2}
                maxLength={160}
                className={fieldClassName}
                placeholder="Your business name"
              />
              <SaveButton disabled={isSavingWorkspace} />
            </form>
            {isLoadingInvoiceSettings && (
              <p className="text-[10px] text-slate-500">
                Loading invoice appearance…
              </p>
            )}
            {invoiceSettingsError && (
              <div
                role="alert"
                className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
              >
                <span>{invoiceSettingsError}</span>
                {!invoiceSettingsLoaded && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceSettingsError("");
                      setInvoiceSettingsLoadAttempt((attempt) => attempt + 1);
                    }}
                    className="font-bold underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            {invoiceSettingsLoaded && (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                  <form
                    onSubmit={saveInvoiceSettings}
                    className="max-w-[640px]"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <div
                        role={invoiceSettings.logoDataUrl ? "img" : undefined}
                        aria-label={
                          invoiceSettings.logoDataUrl
                            ? "Company logo preview"
                            : undefined
                        }
                        className="flex h-14 w-28 items-center justify-center rounded-lg border border-dashed border-[#c7d3ec] bg-white bg-contain bg-center bg-no-repeat text-[9px] text-slate-400"
                        style={
                          invoiceSettings.logoDataUrl
                            ? {
                                backgroundImage: `url("${invoiceSettings.logoDataUrl}")`,
                              }
                            : undefined
                        }
                      >
                        {!invoiceSettings.logoDataUrl && "No logo"}
                      </div>
                      <label className="text-[10px] font-semibold">
                        Company logo
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            void selectInvoiceLogo(event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                          className="mt-1 block max-w-full text-[9px] font-normal text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#edf3ff] file:px-2 file:py-1 file:text-[9px] file:font-semibold file:text-[#1e4fc1]"
                        />
                      </label>
                      {invoiceSettings.logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceSettings((current) => ({
                              ...current,
                              logoDataUrl: null,
                            }));
                            onCompanyLogoChange(null);
                          }}
                          className="text-[9px] font-semibold text-red-700 hover:underline"
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                    <label
                      htmlFor="invoice-company-address"
                      className="text-[10px] font-semibold"
                    >
                      Company address
                    </label>
                    <textarea
                      id="invoice-company-address"
                      rows={2}
                      maxLength={500}
                      value={invoiceSettings.companyAddress}
                      onChange={(event) =>
                        setInvoiceSettings((current) => ({
                          ...current,
                          companyAddress: event.target.value,
                        }))
                      }
                      className={fieldClassName}
                    />
                    <label
                      htmlFor="invoice-tax-id"
                      className="mt-3 block text-[10px] font-semibold"
                    >
                      Tax ID
                    </label>
                    <input
                      id="invoice-tax-id"
                      maxLength={80}
                      value={invoiceSettings.taxId}
                      onChange={(event) =>
                        setInvoiceSettings((current) => ({
                          ...current,
                          taxId: event.target.value,
                        }))
                      }
                      className={fieldClassName}
                    />
                    <div className="mt-4 rounded-lg border border-[#e3e8f3] bg-[#fbfcff] p-3">
                      <p className="mb-3 text-[10px] font-bold text-[#10213c]">
                        Payment details
                      </p>
                      <label
                        htmlFor="invoice-bank-details"
                        className="block text-[10px] font-semibold"
                      >
                        Bank details
                      </label>
                      <textarea
                        id="invoice-bank-details"
                        rows={3}
                        maxLength={1000}
                        placeholder={
                          "Bank name\nAccount name\nAccount number\nSort code / IBAN"
                        }
                        value={invoiceSettings.bankDetails}
                        onChange={(event) =>
                          setInvoiceSettings((current) => ({
                            ...current,
                            bankDetails: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                      />
                      <p className="mt-1 text-[9px] text-slate-500">
                        Display your account details in a clear, separate
                        section on invoices.
                      </p>
                      <label
                        htmlFor="invoice-payment-instructions"
                        className="mt-3 block text-[10px] font-semibold"
                      >
                        Payment instructions
                      </label>
                      <textarea
                        id="invoice-payment-instructions"
                        rows={3}
                        maxLength={1000}
                        placeholder="Example: Use your invoice number as the payment reference."
                        value={invoiceSettings.paymentInstructions}
                        onChange={(event) =>
                          setInvoiceSettings((current) => ({
                            ...current,
                            paymentInstructions: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <label className="text-[10px] font-semibold">
                        Accent color
                        <input
                          type="color"
                          value={invoiceSettings.accentColor}
                          onChange={(event) =>
                            setInvoiceSettings((current) => ({
                              ...current,
                              accentColor: event.target.value,
                            }))
                          }
                          className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-[#c7d3ec] bg-white p-1"
                        />
                      </label>
                      <label className="text-[10px] font-semibold">
                        Invoice footer
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={invoiceSettings.footerText}
                          onChange={(event) =>
                            setInvoiceSettings((current) => ({
                              ...current,
                              footerText: event.target.value,
                            }))
                          }
                          className={fieldClassName}
                        />
                      </label>
                    </div>
                    <label className="mt-3 block text-[10px] font-semibold">
                      Invoice template
                      <select
                        value={invoiceSettings.template}
                        onChange={(event) => {
                          const template = event.target.value;
                          if (isInvoiceTemplate(template)) {
                            setInvoiceSettings((current) => ({
                              ...current,
                              template,
                            }));
                          }
                        }}
                        className={fieldClassName}
                      >
                        <option value="classic">Classic</option>
                        <option value="modern">Modern</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </label>
                    <div className="mt-3 rounded-lg border border-[#e3e8f3] bg-[#fbfcff] p-3">
                      <label className="flex items-start gap-2 text-[10px] font-semibold">
                        <input
                          type="checkbox"
                          checked={
                            invoiceSettings.canRemoveWatermark
                              ? invoiceSettings.showWatermark
                              : true
                          }
                          disabled={!invoiceSettings.canRemoveWatermark}
                          onChange={(event) =>
                            setInvoiceSettings((current) => ({
                              ...current,
                              showWatermark: event.target.checked,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span>
                          Show “Made with DaroBooks” on invoices
                          <span className="mt-1 block font-normal text-slate-500">
                            {invoiceSettings.canRemoveWatermark
                              ? "Paid plans can turn this off."
                              : "The DaroBooks watermark is required on the free plan."}
                          </span>
                        </span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingInvoiceSettings}
                      className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
                    >
                      {isSavingInvoiceSettings ? (
                        <span className="inline-flex items-center gap-2">
                          <ActionSpinner label="Saving invoice settings" />{" "}
                          Saving invoice look…
                        </span>
                      ) : (
                        "Save invoice look"
                      )}
                    </button>
                  </form>
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold text-slate-700">
                      Live invoice preview
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-[#dfe7f4] bg-white shadow-sm">
                      {invoiceSettings.template === "modern" ? (
                        <div
                          className="flex items-start justify-between gap-2 p-4 text-white"
                          style={{
                            backgroundColor: invoiceSettings.accentColor,
                          }}
                        >
                          <div>
                            {invoiceSettings.logoDataUrl && (
                              <Image
                                src={invoiceSettings.logoDataUrl}
                                alt="Company logo"
                                width={112}
                                height={40}
                                unoptimized
                                className="mb-2 max-h-10 max-w-28 object-contain object-left"
                              />
                            )}
                            <p className="text-[12px] font-bold">
                              {businessName.trim() || "Your business name"}
                            </p>
                            {invoiceSettings.companyAddress && (
                              <p className="mt-1 whitespace-pre-line text-[8px] text-white/80">
                                {invoiceSettings.companyAddress}
                              </p>
                            )}
                            {invoiceSettings.taxId && (
                              <p className="mt-1 text-[8px] text-white/80">
                                Tax ID: {invoiceSettings.taxId}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[14px] font-bold tracking-wide">
                              INVOICE
                            </p>
                            <p className="mt-1 text-[8px] text-white/80">
                              INV-0001 · Due in 14 days
                            </p>
                          </div>
                        </div>
                      ) : invoiceSettings.template === "minimal" ? (
                        <div className="grid grid-cols-2 gap-3 p-4">
                          <div>
                            <p className="text-[15px] font-light tracking-wide text-slate-900">
                              INVOICE
                            </p>
                            <p className="mt-1 text-[8px] text-slate-500">
                              INV-0001 · Due in 14 days
                            </p>
                          </div>
                          <div className="text-right">
                            {invoiceSettings.logoDataUrl && (
                              <Image
                                src={invoiceSettings.logoDataUrl}
                                alt="Company logo"
                                width={112}
                                height={40}
                                unoptimized
                                className="mb-2 ml-auto max-h-10 max-w-28 object-contain object-right"
                              />
                            )}
                            <p className="text-[10px] font-semibold text-slate-800">
                              {businessName.trim() || "Your business name"}
                            </p>
                            {invoiceSettings.companyAddress && (
                              <p className="mt-1 whitespace-pre-line text-[8px] text-slate-500">
                                {invoiceSettings.companyAddress}
                              </p>
                            )}
                            {invoiceSettings.taxId && (
                              <p className="mt-1 text-[8px] text-slate-500">
                                Tax ID: {invoiceSettings.taxId}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-start justify-between gap-3 border-b-2 p-4"
                          style={{ borderColor: invoiceSettings.accentColor }}
                        >
                          <div>
                            {invoiceSettings.logoDataUrl && (
                              <Image
                                src={invoiceSettings.logoDataUrl}
                                alt="Company logo"
                                width={112}
                                height={40}
                                unoptimized
                                className="mb-2 max-h-10 max-w-28 object-contain object-left"
                              />
                            )}
                            <p
                              className="text-[12px] font-bold"
                              style={{ color: invoiceSettings.accentColor }}
                            >
                              {businessName.trim() || "Your business name"}
                            </p>
                            {invoiceSettings.companyAddress && (
                              <p className="mt-1 whitespace-pre-line text-[8px] text-slate-600">
                                {invoiceSettings.companyAddress}
                              </p>
                            )}
                            {invoiceSettings.taxId && (
                              <p className="mt-1 text-[8px] text-slate-600">
                                Tax ID: {invoiceSettings.taxId}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className="text-[12px] font-bold"
                              style={{ color: invoiceSettings.accentColor }}
                            >
                              INVOICE
                            </p>
                            <p className="mt-1 text-[8px] text-slate-600">
                              INV-0001
                            </p>
                            <p className="text-[8px] text-slate-600">
                              Due in 14 days
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mx-4 mt-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-[8px]">
                        <div>
                          <p className="font-bold uppercase tracking-wide text-slate-500">
                            Bill to
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            Example Customer
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-slate-600">
                          Due in 14 days
                        </p>
                      </div>
                      <table className="mx-4 mt-5 w-[calc(100%-2rem)] table-fixed text-[8px]">
                        <colgroup>
                          <col className="w-[46%]" />
                          <col className="w-[12%]" />
                          <col className="w-[21%]" />
                          <col className="w-[21%]" />
                        </colgroup>
                        <thead>
                          <tr
                            className="border-b text-left"
                            style={{
                              borderColor: `${invoiceSettings.accentColor}55`,
                              color: invoiceSettings.accentColor,
                            }}
                          >
                            <th className="py-2.5 pr-2 font-bold">Item</th>
                            <th className="px-2 py-2.5 text-right font-bold">
                              Qty
                            </th>
                            <th className="px-2 py-2.5 text-right font-bold">
                              Rate
                            </th>
                            <th className="py-2.5 pl-2 text-right font-bold">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100 text-slate-700">
                            <td className="py-3.5 pr-2 font-medium">
                              Consulting
                            </td>
                            <td className="px-2 py-3.5 text-right">1</td>
                            <td className="px-2 py-3.5 text-right">$250.00</td>
                            <td className="py-3.5 pl-2 text-right font-semibold">
                              $250.00
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mx-4 mt-4 flex justify-end border-t border-slate-100 pt-3">
                        <div className="flex min-w-36 justify-between gap-5 text-[9px] font-bold text-slate-800">
                          <span>Total</span>
                          <span>$250.00</span>
                        </div>
                      </div>
                      {invoiceSettings.bankDetails && (
                        <div className="mx-4 mt-4 rounded-md bg-[#f7f9fd] px-3 py-3">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-700">
                            Bank details
                          </p>
                          <p className="mt-1 whitespace-pre-line text-[8px] text-slate-600">
                            {invoiceSettings.bankDetails}
                          </p>
                        </div>
                      )}
                      {invoiceSettings.paymentInstructions && (
                        <div className="mx-4 mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Payment note
                          </p>
                          <p className="mt-1 whitespace-pre-line text-center text-[8px] leading-relaxed text-slate-600">
                            {invoiceSettings.paymentInstructions}
                          </p>
                        </div>
                      )}
                      {invoiceSettings.footerText && (
                        <p className="mx-4 mt-4 border-t border-slate-100 px-2 pt-3 text-center text-[8px] text-slate-500">
                          {invoiceSettings.footerText}
                        </p>
                      )}
                      {invoiceSettings.showWatermark && (
                        <div className="mt-3 flex items-center justify-center gap-1 border-t border-slate-100 pt-2 text-[8px] text-slate-400">
                          <Image
                            src="/icon.png"
                            alt=""
                            width={10}
                            height={10}
                          />
                          <span>Made with DaroBooks</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {billingData && (
                    <label className="mb-3 block max-w-[320px] text-[9px] font-semibold text-slate-600">
                      Payment provider
                      {billingData.paymentProviders.length ? (
                        <select
                          value={paymentProvider}
                          onChange={(event) => {
                            if (isPaymentProvider(event.target.value)) {
                              setPaymentProvider(event.target.value);
                            }
                          }}
                          className="mt-1 block w-full rounded-lg border border-[#dbe4f3] bg-white px-3 py-2 text-[10px]"
                        >
                          {billingData.paymentProviders.map((provider) => (
                            <option
                              key={provider.provider}
                              value={provider.provider}
                            >
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="mt-1 block rounded-md bg-amber-50 p-2 text-[9px] font-normal text-amber-800">
                          No payment provider is configured. Contact your
                          administrator.
                        </span>
                      )}
                    </label>
                  )}
                </div>
                {invoiceSettingsMessage && (
                  <p role="status" className="mt-3 text-[9px] text-emerald-700">
                    {invoiceSettingsMessage}
                  </p>
                )}
              </>
            )}
          </SettingsCard>
        )}

        {activeTab === "Company URL" && (
          <SettingsCard title="Company URL">
            <p className="mb-4 max-w-[650px] text-[10px] leading-relaxed text-slate-600">
              Your company URL is the unique address used to open your
              workspace.
            </p>
            {workspaceUrlError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
              >
                {workspaceUrlError}
              </p>
            )}
            {!workspaceUrlLoaded ? (
              <p className="text-[10px] text-slate-500">
                Loading your company URL…
              </p>
            ) : workspaceUrl?.canChange ? (
              <form onSubmit={saveWorkspaceUrl} className="max-w-[520px]">
                <label
                  htmlFor="settings-company-url"
                  className="text-[10px] font-semibold"
                >
                  Company URL name
                  <input
                    id="settings-company-url"
                    value={workspaceUrlSlug}
                    onChange={(event) =>
                      setWorkspaceUrlSlug(event.target.value.toLowerCase())
                    }
                    required
                    minLength={2}
                    maxLength={63}
                    pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
                    className={fieldClassName}
                    placeholder="your-company"
                  />
                </label>
                <p className="mt-1 text-[9px] text-slate-500">
                  Use lowercase letters, numbers, and hyphens. Your URL:{" "}
                  {getTenantUrlPreview(
                    workspaceUrl.tenantUrl,
                    workspaceUrl.tenantSlug,
                    workspaceUrlSlug,
                  ) ?? "will be generated when saved"}
                </p>
                <button
                  type="submit"
                  disabled={isSavingWorkspaceUrl}
                  className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingWorkspaceUrl ? "Saving URL…" : "Save company URL"}
                </button>
                {workspaceUrl.tenantUrl && (
                  <a
                    href={workspaceUrl.tenantUrl}
                    onClick={(event) => void openWorkspaceUrl(event)}
                    aria-busy={isOpeningWorkspaceUrl}
                    className="mt-3 block break-all text-[9px] font-semibold text-[#1e4fc1] underline"
                  >
                    {isOpeningWorkspaceUrl
                      ? "Opening company URL…"
                      : `Open current company URL: ${workspaceUrl.tenantUrl}`}
                  </a>
                )}
              </form>
            ) : (
              <div className="max-w-[520px] rounded-lg border border-[#e3e8f3] bg-[#fbfcff] p-3">
                <p className="text-[10px] font-semibold text-slate-700">
                  Current company URL
                </p>
                {workspaceUrl?.tenantUrl ? (
                  <a
                    href={workspaceUrl.tenantUrl}
                    onClick={(event) => void openWorkspaceUrl(event)}
                    aria-busy={isOpeningWorkspaceUrl}
                    className="mt-1 block break-all text-[10px] font-semibold text-[#1e4fc1] underline"
                  >
                    {isOpeningWorkspaceUrl
                      ? "Opening company URL…"
                      : workspaceUrl.tenantUrl}
                  </a>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500">
                    No company URL has been set.
                  </p>
                )}
                <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                  {workspaceUrl?.canChange === false && user
                    ? "Changing the company URL is available on paid plans and to the workspace owner only."
                    : "Free plan company URLs cannot be changed."}
                </p>
              </div>
            )}
            {workspaceUrlMessage && (
              <p role="status" className="mt-3 text-[9px] text-emerald-700">
                {workspaceUrlMessage}
              </p>
            )}
          </SettingsCard>
        )}

        {activeTab === "Region and currency" && (
          <SettingsCard title="Regional preferences">
            <p className="mb-4 max-w-[650px] text-[10px] leading-relaxed text-slate-600">
              Set your business country and default currency. Use standard
              two-letter country and three-letter currency codes.
            </p>
            <form onSubmit={submitWorkspace} className="max-w-[560px]">
              <label
                htmlFor="settings-region-business"
                className="text-[10px] font-semibold"
              >
                Business name
              </label>
              <input
                id="settings-region-business"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
                minLength={1}
                maxLength={160}
                className={fieldClassName}
                placeholder="Your business name"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="settings-country"
                    className="text-[10px] font-semibold"
                  >
                    Country code
                  </label>
                  <input
                    id="settings-country"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    className={fieldClassName}
                    placeholder="NG"
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-currency"
                    className="text-[10px] font-semibold"
                  >
                    Currency code
                  </label>
                  <select
                    id="settings-currency"
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                    className={fieldClassName}
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <SaveButton disabled={isSavingWorkspace} />
            </form>
          </SettingsCard>
        )}

        {activeTab === "Plan and billing" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold">Choose a plan</h2>
                <p className="mt-1 text-[9px] text-slate-600">
                  {billingData
                    ? `Plans and checkout are shown in ${billingData.currency}.`
                    : "Choose a plan for your workspace."}
                </p>
              </div>
              <div
                aria-label="Billing period"
                className="inline-flex rounded-full border border-[#dbe4f3] bg-white p-1"
              >
                {(["monthly", "yearly"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={billingPeriod === period}
                    onClick={() => setBillingPeriod(period)}
                    className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${
                      billingPeriod === period
                        ? "bg-[#1e4fc1] text-white"
                        : "text-slate-600 hover:text-[#1e4fc1]"
                    }`}
                  >
                    {period === "monthly" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>
            </div>
            {billingError && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
              >
                <p>{billingError}</p>
                {billingLoaded && (
                  <button
                    type="button"
                    onClick={() => {
                      setBillingLoaded(false);
                      setBillingError("");
                    }}
                    className="mt-2 font-semibold underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            {billingMessage && (
              <p
                role="status"
                className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
              >
                {billingMessage}
              </p>
            )}
            {isLoadingBilling && <DashboardLoading />}
            {billingData && (
              <>
                <div className="mb-3 rounded-lg border border-[#dbe4f3] bg-white px-3 py-2 text-[10px]">
                  <span className="font-semibold">Current plan:</span>{" "}
                  <span className="capitalize">
                    {billingData.subscription.plan}
                  </span>
                  {billingData.subscription.endsAt && (
                    <span className="text-slate-600">
                      {" "}
                      · Access through{" "}
                      {new Date(
                        billingData.subscription.endsAt,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {billingPlans.map((plan) => {
                    const monthlyAmount = plan.monthlyAmount;
                    const monthlyTotalAmount =
                      monthlyAmount === null
                        ? null
                        : plan.key === "free"
                          ? 0
                          : applyDiscounts(
                              Math.round(monthlyAmount * 100),
                              plan.discountPercent,
                              billingData.generalDiscountPercent,
                            ) / 100;
                    const totalAmount =
                      monthlyAmount === null
                        ? null
                        : plan.key === "free"
                          ? 0
                          : applyDiscounts(
                              Math.round(monthlyAmount * 100) * 12,
                              plan.discountPercent,
                              billingData.generalDiscountPercent,
                            ) / 100;
                    const effectiveDiscountPercent =
                      100 *
                      (1 -
                        (1 - plan.discountPercent / 100) *
                          (1 - billingData.generalDiscountPercent / 100));
                    const isCurrent =
                      billingData.subscription.plan === plan.key;
                    return (
                      <article
                        key={plan.key}
                        className={`flex flex-col rounded-xl border p-4 ${
                          plan.key === "business"
                            ? "border-[#1e4fc1] bg-[#eef3ff]"
                            : "border-[#e1e8f4] bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[12px] font-bold">{plan.name}</h3>
                          {isCurrent && (
                            <span className="rounded-full bg-[#e6f5f3] px-2 py-1 text-[8px] font-bold text-[#08766f]">
                              Current plan
                            </span>
                          )}
                        </div>
                        <p className="mt-1 min-h-8 text-[9px] leading-relaxed text-slate-600">
                          <PlanDescription value={plan.audience} />
                        </p>
                        {plan.key === "free" ? (
                          <p className="mt-3 text-[11px] font-semibold">
                            Free
                            <span className="ml-1 font-sora text-[9px] font-normal text-slate-500">
                              forever
                            </span>
                          </p>
                        ) : totalAmount === null ? (
                          <p className="mt-3 text-[11px] font-semibold text-slate-500">
                            Price not configured
                          </p>
                        ) : (
                          <>
                            <p className="mt-3 font-jakarta text-[22px] font-bold">
                              {formatCurrency(
                                billingData.currency,
                                billingPeriod === "yearly"
                                  ? totalAmount
                                  : (monthlyTotalAmount ?? totalAmount),
                              )}
                              <span className="ml-1 font-sora text-[9px] font-normal text-slate-500">
                                /{" "}
                                {billingPeriod === "monthly" ? "month" : "year"}
                              </span>
                            </p>
                            {billingPeriod === "yearly" && (
                              <p className="mt-0.5 text-[8px] text-slate-500">
                                {formatCurrency(
                                  billingData.currency,
                                  monthlyTotalAmount ?? 0,
                                )}{" "}
                                per month, billed yearly
                                {effectiveDiscountPercent > 0
                                  ? ` · ${effectiveDiscountPercent.toFixed(2).replace(/\.?0+$/, "")}% discount`
                                  : ""}
                              </p>
                            )}
                          </>
                        )}
                        <ul className="mt-3 flex-1 space-y-1.5">
                          <li className="text-[9px] font-semibold text-slate-700">
                            <span className="mr-1.5 text-[#08766f]">✓</span>
                            {plan.usersLimit === null
                              ? "Unlimited users"
                              : `${plan.usersLimit} users`}
                          </li>
                          <li className="text-[9px] font-semibold text-slate-700">
                            <span className="mr-1.5 text-[#08766f]">✓</span>
                            {plan.companyLimit === null
                              ? "Unlimited companies"
                              : `${plan.companyLimit} compan${plan.companyLimit === 1 ? "y" : "ies"}`}
                          </li>
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="text-[9px] text-slate-700"
                            >
                              <span className="mr-1.5 text-[#08766f]">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          disabled={
                            plan.key === "free" ||
                            isCurrent ||
                            totalAmount === null ||
                            checkoutPlan !== null ||
                            billingData.paymentProviders.length === 0
                          }
                          onClick={() => void startCheckout(plan)}
                          className={`mt-4 w-full rounded-md px-3 py-2 text-[9px] font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                            plan.key === "business"
                              ? "bg-[#1e4fc1] hover:bg-blue-800"
                              : "bg-[#1e4fc1] hover:bg-blue-800"
                          }`}
                        >
                          {checkoutPlan === plan.key
                            ? "Opening checkout…"
                            : plan.key === "free"
                              ? "Free plan"
                              : isCurrent
                                ? "Current plan"
                                : totalAmount === null
                                  ? "Unavailable"
                                  : `Choose ${plan.name}`}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
                  Payments are processed by your selected payment provider.
                  Plans are paid upfront for the selected period and require
                  manual renewal. Applicable taxes or provider charges may
                  apply.
                </p>
              </>
            )}
            {user?.isSuperAdmin && (
              <Link
                href="/dashboard/pricing"
                className="mt-4 inline-block text-[9px] font-semibold text-[#1e4fc1] hover:underline"
              >
                Manage published prices
              </Link>
            )}
          </div>
        )}

        {activeTab === "Your data" && (
          <SettingsCard title="Your account data">
            <div className="mb-5 rounded-lg border border-[#edf1f7] bg-[#f8faff] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e4fc1] text-white">
                  <RiUser3Line className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#10213c]">
                    {user?.fullName ?? "Not available"}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {user?.email ?? "Not available"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[#e1e8f4] p-4">
                <RiDownloadLine className="h-5 w-5 text-[#1e4fc1]" />
                <h3 className="mt-3 text-[11px] font-bold text-[#10213c]">
                  Export data
                </h3>
                <p className="mt-1 min-h-10 text-[9px] leading-relaxed text-slate-500">
                  Download your complete DaroBooks data, including account
                  details, workspace settings, records, activity, support, and
                  billing.
                </p>
                <button
                  type="button"
                  disabled={isExportingBusinessData || isImportingBusinessData}
                  onClick={() => void exportBusinessData()}
                  className="mt-3 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {isExportingBusinessData ? (
                    <span className="inline-flex items-center gap-2">
                      <ActionSpinner label="Exporting business data" />{" "}
                      Preparing export…
                    </span>
                  ) : (
                    "Export business data"
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-[#e1e8f4] p-4">
                <RiUploadLine className="h-5 w-5 text-[#1e4fc1]" />
                <h3 className="mt-3 text-[11px] font-bold text-[#10213c]">
                  Import data
                </h3>
                <p className="mt-1 min-h-10 text-[9px] leading-relaxed text-slate-500">
                  Restore a JSON export as one transaction. Conflicting records
                  will not be saved.
                </p>
                <label className="mt-3 inline-flex cursor-pointer rounded-md border border-[#c7d3ec] bg-white px-4 py-2 text-[10px] font-bold text-[#1e4fc1] transition hover:bg-blue-50 has-[:disabled]:cursor-wait has-[:disabled]:opacity-70">
                  {isImportingBusinessData ? (
                    <span className="inline-flex items-center gap-2">
                      <ActionSpinner label="Importing business data" />{" "}
                      Importing…
                    </span>
                  ) : (
                    "Import JSON export"
                  )}
                  <input
                    type="file"
                    accept="application/json,.json"
                    disabled={
                      isImportingBusinessData || isExportingBusinessData
                    }
                    onChange={(event) => {
                      const input = event.currentTarget;
                      void importBusinessData(input.files?.[0]).finally(() => {
                        input.value = "";
                      });
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            {businessDataError && (
              <p role="alert" className="mt-3 text-[10px] text-red-600">
                {businessDataError}
              </p>
            )}
            {businessDataMessage && (
              <p role="status" className="mt-3 text-[10px] text-emerald-700">
                {businessDataMessage}
              </p>
            )}
            <p className="mt-4 max-w-[620px] text-[9px] leading-relaxed text-slate-500">
              Exports include your account profile, workspace and preferences,
              dashboard records, audit activity, support tickets, notifications,
              and billing data. Imports add supported business records and run
              as a single transaction; if a record conflicts or fails
              validation, none of the file is saved. Keep export files private
              because they contain business data.
            </p>
            <Link
              href="/privacy"
              className="mt-3 inline-block text-[10px] font-semibold text-[#1e4fc1] hover:underline"
            >
              Read the Privacy Policy
            </Link>
          </SettingsCard>
        )}
      </div>
    </section>
  );
}

const fieldClassName =
  "mt-1.5 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2.5 text-[10px] outline-none transition placeholder:text-slate-400 focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100";

function SaveButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
    >
      {disabled ? (
        <span className="inline-flex items-center gap-2">
          <ActionSpinner label="Saving settings" /> Saving…
        </span>
      ) : (
        "Save changes"
      )}
    </button>
  );
}

function isTaxSettings(value: unknown): value is TaxSettings {
  return (
    !!value &&
    typeof value === "object" &&
    "vatRate" in value &&
    typeof value.vatRate === "number" &&
    Number.isFinite(value.vatRate) &&
    "whtRate" in value &&
    typeof value.whtRate === "number" &&
    Number.isFinite(value.whtRate)
  );
}

function isInvoiceSettings(value: unknown): value is InvoiceSettings {
  return (
    !!value &&
    typeof value === "object" &&
    "companyAddress" in value &&
    typeof value.companyAddress === "string" &&
    "taxId" in value &&
    typeof value.taxId === "string" &&
    "bankDetails" in value &&
    typeof value.bankDetails === "string" &&
    "paymentInstructions" in value &&
    typeof value.paymentInstructions === "string" &&
    "accentColor" in value &&
    typeof value.accentColor === "string" &&
    "footerText" in value &&
    typeof value.footerText === "string" &&
    "logoDataUrl" in value &&
    (typeof value.logoDataUrl === "string" || value.logoDataUrl === null) &&
    "template" in value &&
    isInvoiceTemplate(value.template) &&
    "showWatermark" in value &&
    typeof value.showWatermark === "boolean" &&
    "canRemoveWatermark" in value &&
    typeof value.canRemoveWatermark === "boolean"
  );
}

function isInvoiceTemplate(value: unknown): value is InvoiceTemplate {
  return value === "classic" || value === "modern" || value === "minimal";
}

function isWorkspaceUrlSettings(value: unknown): value is WorkspaceUrlSettings {
  return (
    !!value &&
    typeof value === "object" &&
    "tenantSlug" in value &&
    (typeof value.tenantSlug === "string" || value.tenantSlug === null) &&
    "tenantUrl" in value &&
    (typeof value.tenantUrl === "string" || value.tenantUrl === null) &&
    "canChange" in value &&
    typeof value.canChange === "boolean"
  );
}

function isTenantHandoffResponse(
  value: unknown,
): value is { handoffToken: string; tenantSlug: string } {
  return (
    !!value &&
    typeof value === "object" &&
    "handoffToken" in value &&
    typeof value.handoffToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(value.handoffToken) &&
    "tenantSlug" in value &&
    typeof value.tenantSlug === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value.tenantSlug)
  );
}

function getTenantUrlPreview(
  tenantUrl: string | null,
  tenantSlug: string | null,
  nextSlug: string,
): string | null {
  if (!tenantUrl) return null;
  const url = new URL(tenantUrl);
  if (tenantSlug && url.hostname.startsWith(`${tenantSlug}.`)) {
    url.hostname = `${nextSlug.trim() || tenantSlug}.${url.hostname.slice(
      tenantSlug.length + 1,
    )}`;
  }
  return url.origin;
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e1e8f4] bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-[12px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function isActivityResponse(
  value: unknown,
): value is { activities: Activity[] } {
  return (
    !!value &&
    typeof value === "object" &&
    "activities" in value &&
    Array.isArray(value.activities) &&
    value.activities.every(
      (activity) =>
        !!activity &&
        typeof activity === "object" &&
        "id" in activity &&
        typeof activity.id === "string" &&
        "action" in activity &&
        typeof activity.action === "string" &&
        "description" in activity &&
        typeof activity.description === "string" &&
        "createdAt" in activity &&
        typeof activity.createdAt === "string",
    )
  );
}

function isTeamMembersResponse(
  value: unknown,
): value is { users: TeamMember[] } {
  return (
    !!value &&
    typeof value === "object" &&
    "users" in value &&
    Array.isArray(value.users) &&
    value.users.every(
      (member) =>
        !!member &&
        typeof member === "object" &&
        "id" in member &&
        typeof member.id === "string" &&
        "companyId" in member &&
        typeof member.companyId === "string" &&
        "fullName" in member &&
        typeof member.fullName === "string" &&
        "email" in member &&
        typeof member.email === "string" &&
        "roleName" in member &&
        typeof member.roleName === "string" &&
        "teamName" in member &&
        (typeof member.teamName === "string" || member.teamName === null) &&
        "emailVerified" in member &&
        typeof member.emailVerified === "boolean",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isBusinessDataImportResponse(value: unknown): value is {
  imported: {
    contacts: number;
    items: number;
    invoices: number;
    projects: number;
    timeEntries: number;
  };
} {
  if (!isRecord(value) || !isRecord(value.imported)) return false;
  const imported = value.imported;
  return (
    typeof imported.contacts === "number" &&
    Number.isSafeInteger(imported.contacts) &&
    imported.contacts >= 0 &&
    typeof imported.items === "number" &&
    Number.isSafeInteger(imported.items) &&
    imported.items >= 0 &&
    typeof imported.invoices === "number" &&
    Number.isSafeInteger(imported.invoices) &&
    imported.invoices >= 0 &&
    typeof imported.projects === "number" &&
    Number.isSafeInteger(imported.projects) &&
    imported.projects >= 0 &&
    typeof imported.timeEntries === "number" &&
    Number.isSafeInteger(imported.timeEntries) &&
    imported.timeEntries >= 0
  );
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

function isBillingData(value: unknown): value is BillingData {
  if (
    !value ||
    typeof value !== "object" ||
    !("currency" in value) ||
    (value.currency !== "USD" &&
      value.currency !== "NGN" &&
      value.currency !== "INR") ||
    !("generalDiscountPercent" in value) ||
    typeof value.generalDiscountPercent !== "number" ||
    !Number.isFinite(value.generalDiscountPercent) ||
    value.generalDiscountPercent < 0 ||
    value.generalDiscountPercent >= 100 ||
    !("paymentProviders" in value) ||
    !Array.isArray(value.paymentProviders) ||
    !value.paymentProviders.every(
      (provider: unknown) =>
        !!provider &&
        typeof provider === "object" &&
        "provider" in provider &&
        typeof provider.provider === "string" &&
        isPaymentProvider(provider.provider) &&
        "name" in provider &&
        typeof provider.name === "string",
    ) ||
    !("plans" in value) ||
    !Array.isArray(value.plans) ||
    !("subscription" in value) ||
    !value.subscription ||
    typeof value.subscription !== "object"
  ) {
    return false;
  }

  const validPlans = value.plans.every(
    (plan) =>
      !!plan &&
      typeof plan === "object" &&
      "key" in plan &&
      typeof plan.key === "string" &&
      /^[a-z0-9][a-z0-9_-]{1,39}$/.test(plan.key) &&
      "name" in plan &&
      typeof plan.name === "string" &&
      "audience" in plan &&
      typeof plan.audience === "string" &&
      "features" in plan &&
      Array.isArray(plan.features) &&
      plan.features.every((feature: unknown) => typeof feature === "string") &&
      "usersLimit" in plan &&
      (plan.usersLimit === null ||
        (typeof plan.usersLimit === "number" &&
          Number.isInteger(plan.usersLimit) &&
          plan.usersLimit > 0)) &&
      "companyLimit" in plan &&
      (plan.companyLimit === null ||
        (typeof plan.companyLimit === "number" &&
          Number.isInteger(plan.companyLimit) &&
          plan.companyLimit > 0)) &&
      "discountPercent" in plan &&
      typeof plan.discountPercent === "number" &&
      Number.isFinite(plan.discountPercent) &&
      plan.discountPercent >= 0 &&
      plan.discountPercent < 100 &&
      "monthlyAmount" in plan &&
      (plan.key === "free"
        ? plan.monthlyAmount === 0
        : plan.monthlyAmount === null ||
          (typeof plan.monthlyAmount === "number" &&
            Number.isFinite(plan.monthlyAmount) &&
            plan.monthlyAmount > 0)),
  );
  const subscription = value.subscription;
  return (
    validPlans &&
    "plan" in subscription &&
    typeof subscription.plan === "string" &&
    "billingInterval" in subscription &&
    (subscription.billingInterval === null ||
      subscription.billingInterval === "monthly" ||
      subscription.billingInterval === "yearly") &&
    "currency" in subscription &&
    (subscription.currency === null ||
      typeof subscription.currency === "string") &&
    "amountMinor" in subscription &&
    (subscription.amountMinor === null ||
      typeof subscription.amountMinor === "number") &&
    "endsAt" in subscription &&
    (subscription.endsAt === null || typeof subscription.endsAt === "string")
  );
}

function formatCurrency(currency: BillingData["currency"], amount: number) {
  const locale =
    currency === "NGN" ? "en-NG" : currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isPaymentProvider(value: string): value is PaymentProvider {
  return (
    value === "paystack" ||
    value === "flutterwave" ||
    value === "paypal" ||
    value === "stripe"
  );
}

function applyDiscounts(
  amountMinor: number,
  planDiscountPercent: number,
  generalDiscountPercent: number,
): number {
  const planDiscounted = Math.round(
    amountMinor * (1 - planDiscountPercent / 100),
  );
  return Math.round(planDiscounted * (1 - generalDiscountPercent / 100));
}
