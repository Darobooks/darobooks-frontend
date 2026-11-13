"use client";

import Image from "next/image";
import Link from "next/link";
import {
  RiAlertLine,
  RiAddLine,
  RiArrowDownSLine,
  RiBankLine,
  RiBarChart2Line,
  RiBillLine,
  RiBook2Line,
  RiBuilding2Line,
  RiCalendarTodoLine,
  RiCloseLine,
  RiContactsBookLine,
  RiContactsLine,
  RiDashboardLine,
  RiExchangeDollarLine,
  RiFileList3Line,
  RiFolderLine,
  RiGovernmentLine,
  RiGroupLine,
  RiHandCoinLine,
  RiLock2Line,
  RiLogoutBoxRLine,
  RiNotification3Line,
  RiPercentLine,
  RiReceiptLine,
  RiSafe2Line,
  RiSearchLine,
  RiSettings3Line,
  RiShoppingBag3Line,
  RiUser3Line,
  RiWallet3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiBookOpenLine,
  RiCustomerService2Line,
  RiTicket2Line,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import logo from "@/app/logo-2.png";
import favicon from "@/app/icon.png";
import { showToast } from "@/app/components/toast";
import { getLogoutRedirectUrl } from "@/app/tenant-domain";
import DashboardLoading from "./DashboardLoading";
import DashboardInvoices from "./DashboardInvoices";
import DashboardCollections from "./DashboardCollections";
import DashboardContacts from "./DashboardContacts";
import DashboardItems from "./DashboardItems";
import DashboardPricingAdmin from "./DashboardPricingAdmin";
import DashboardProjects from "./DashboardProjects";
import DashboardBills from "./DashboardBills";
import DashboardPayouts from "./DashboardPayouts";
import DashboardPayroll from "./DashboardPayroll";
import DashboardBanking from "./DashboardBanking";
import DashboardAssist from "./DashboardAssist";
import DashboardLedger from "./DashboardLedger";
import DashboardAssets from "./DashboardAssets";
import DashboardTaxCenter from "./DashboardTaxCenter";
import DashboardEInvoicing from "./DashboardEInvoicing";
import DashboardReports from "./DashboardReports";
import DashboardBudgets from "./DashboardBudgets";
import DashboardGroupView from "./DashboardGroupView";
import DashboardRequisitions from "./DashboardRequisitions";
import DashboardSettings from "./DashboardSettings";
import DashboardUsersAdmin from "./DashboardUsersAdmin";
import DashboardClientsAdmin from "./DashboardClientsAdmin";
import DashboardRolesAdmin from "./DashboardRolesAdmin";
import DashboardTeamsAdmin from "./DashboardTeamsAdmin";
import DashboardTeamRolesAdmin from "./DashboardTeamRolesAdmin";
import DashboardApprovalFlows from "./DashboardApprovalFlows";
import DashboardNotificationsAdmin from "./DashboardNotificationsAdmin";
import DashboardNotifications from "./DashboardNotifications";
import DashboardWebsiteSettings from "./DashboardWebsiteSettings";
import DashboardPractice from "./DashboardPractice";
import DashboardSupport from "./DashboardSupport";
import DashboardKnowledgeBase from "./DashboardKnowledgeBase";
import DashboardTickets from "./DashboardTickets";
import DashboardKnowledgeBaseAdmin from "./DashboardKnowledgeBaseAdmin";
import DashboardSupportConsole from "./DashboardSupportConsole";
import ActionSpinner from "../components/ActionSpinner";

const NOTIFICATIONS_CACHE_KEY = "darobooksNotifications";

type IconType = typeof RiDashboardLine;
type DashboardInvoiceSummary = {
  currency: string;
  draftCount: number;
  draftAmount: number;
  outstandingCount: number;
  outstandingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  paidThisMonthCount: number;
  paidThisMonthAmount: number;
};
type DashboardRecentInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  amountDue: number;
  currency: string;
  dueDate: string;
  status: "draft" | "sending" | "sent" | "paid" | "cancelled";
};
type DashboardTaxSettings = { vatRate: number; whtRate: number };
type DashboardCashFlow = { month: string; moneyIn: number; moneyOut: number };
type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
type DashboardHomeData = {
  user: {
    fullName: string;
    email: string;
    isSuperAdmin: boolean;
    roleKey: string;
    twoStepEnabled: boolean;
    features: string[];
    planFeatures: string[];
    planKey: string;
  };
  workspace: {
    businessName: string;
    countryCode: string | null;
    currencyCode: string | null;
    tenantUrl: string | null;
  } | null;
  taxSettings: DashboardTaxSettings;
  invoiceSummary: DashboardInvoiceSummary[];
  recentInvoices: DashboardRecentInvoice[];
  cashFlow: DashboardCashFlow[];
};
type DashboardCompany = { id: string; name: string };
type DashboardCompaniesResponse = {
  companies: DashboardCompany[];
  currentCompanyId: string;
  canCreateCompany: boolean;
};
const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
const DASHBOARD_HOME_CACHE_PREFIX = "darobooksDashboardHome:";
const SIDEBAR_GROUPS_STORAGE_KEY = "darobooksSidebarGroups";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

type NavigationItem = {
  label: string;
  icon: IconType;
  href?: string;
  view?:
    | "home"
    | "invoices"
    | "invoice-new"
    | "invoice-view"
    | "collections"
    | "contacts"
    | "items"
    | "projects"
    | "bills"
    | "payouts"
    | "payroll"
    | "banking"
    | "assist"
    | "ledger"
    | "assets"
    | "tax-center"
    | "e-invoicing"
    | "reports"
    | "budgets"
    | "group-view"
    | "requisitions"
    | "settings"
    | "pricing-admin"
    | "website-settings"
    | "users-admin"
    | "clients-admin"
    | "roles-admin"
    | "teams-admin"
    | "team-roles-admin"
    | "approval-flows"
    | "notifications-admin"
    | "notifications"
    | "practice"
    | "support"
    | "knowledge-base"
    | "tickets-admin"
    | "knowledge-base-admin"
    | "support-console";
};
const NAVIGATION_FEATURES: Record<string, string> = {
  Invoices: "invoices",
  "e-Invoicing": "e-invoicing",
  Collections: "collections",
  Contacts: "contacts",
  "Items and stock": "items",
  Projects: "projects",
  Bills: "bills",
  Payouts: "payouts",
  Requisitions: "requisitions",
  Settings: "settings",
  Payroll: "payroll",
  Banking: "banking",
  Assist: "assist",
  Ledger: "ledger",
  Assets: "assets",
  "Tax centre": "tax-center",
  Reports: "reports",
  Budgets: "budgets",
  "Group view": "group-view",
  Practice: "practice",
  "Approval flows": "approval-flows",
  Teams: "teams",
  "Team roles": "team-roles",
};

const navigationGroups: {
  label: string;
  items: NavigationItem[];
  defaultCollapsed?: boolean;
}[] = [
  {
    label: "Sales",
    items: [
      {
        label: "Invoices",
        icon: RiFileList3Line,
        href: "/dashboard/invoices",
        view: "invoices",
      },
      {
        label: "Collections",
        icon: RiHandCoinLine,
        href: "/dashboard/collections",
        view: "collections",
      },
      {
        label: "Contacts",
        icon: RiContactsLine,
        href: "/dashboard/contacts",
        view: "contacts",
      },
      {
        label: "Items and stock",
        icon: RiShoppingBag3Line,
        href: "/dashboard/items",
        view: "items",
      },
      {
        label: "Projects",
        icon: RiFolderLine,
        href: "/dashboard/projects",
        view: "projects",
      },
    ],
  },
  {
    label: "Spending",
    items: [
      {
        label: "Bills",
        icon: RiBillLine,
        href: "/dashboard/bills",
        view: "bills",
      },
      {
        label: "Requisitions",
        icon: RiFileList3Line,
        href: "/dashboard/requisitions",
        view: "requisitions",
      },
      {
        label: "Payouts",
        icon: RiExchangeDollarLine,
        href: "/dashboard/payouts",
        view: "payouts",
      },
      {
        label: "Payroll",
        icon: RiContactsBookLine,
        href: "/dashboard/payroll",
        view: "payroll",
      },
    ],
  },
  {
    label: "Banking",
    items: [
      {
        label: "Banking",
        icon: RiBankLine,
        href: "/dashboard/banking",
        view: "banking",
      },
      {
        label: "Assist",
        icon: RiCalendarTodoLine,
        href: "/dashboard/assist",
        view: "assist",
      },
    ],
  },
  {
    label: "Accounting",
    items: [
      {
        label: "Ledger",
        icon: RiBook2Line,
        href: "/dashboard/ledger",
        view: "ledger",
      },
      { label: "Assets", icon: RiSafe2Line, href: "/dashboard/assets", view: "assets" },
      { label: "Tax centre", icon: RiGovernmentLine, href: "/dashboard/tax-center", view: "tax-center" },
      { label: "e-Invoicing", icon: RiReceiptLine, href: "/dashboard/e-invoicing", view: "e-invoicing" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", icon: RiBarChart2Line, href: "/dashboard/reports", view: "reports" },
      { label: "Budgets", icon: RiPercentLine, href: "/dashboard/budgets", view: "budgets" },
      { label: "Group view", icon: RiGroupLine, href: "/dashboard/group-view", view: "group-view" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Practice", icon: RiBuilding2Line, href: "/dashboard/practice", view: "practice" },
      {
        label: "Settings",
        icon: RiSettings3Line,
        href: "/dashboard/settings",
        view: "settings",
      },
    ],
  },
  {
    label: "Teams",
    items: [
      {
        label: "Teams",
        icon: RiUser3Line,
        href: "/dashboard/teams",
        view: "teams-admin",
      },
      {
        label: "Team roles",
        icon: RiGroupLine,
        href: "/dashboard/team-roles",
        view: "team-roles-admin",
      },
      {
        label: "Approval flows",
        icon: RiFileList3Line,
        href: "/dashboard/approval-flows",
        view: "approval-flows",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "Support console",
        icon: RiCustomerService2Line,
        href: "/dashboard/support-console",
        view: "support-console",
      },
    ],
  },
  {
    label: "Super Admin",
    defaultCollapsed: true,
    items: [
      {
        label: "Users",
        icon: RiUser3Line,
        href: "/dashboard/users",
        view: "users-admin",
      },
      {
        label: "Clients",
        icon: RiContactsLine,
        href: "/dashboard/clients",
        view: "clients-admin",
      },
      {
        label: "Roles and access",
        icon: RiGroupLine,
        href: "/dashboard/roles",
        view: "roles-admin",
      },
      {
        label: "Notification management",
        icon: RiNotification3Line,
        href: "/dashboard/notifications",
        view: "notifications-admin",
      },
      {
        label: "Tickets",
        icon: RiTicket2Line,
        href: "/dashboard/tickets",
        view: "tickets-admin",
      },
      {
        label: "Knowledge base",
        icon: RiBookOpenLine,
        href: "/dashboard/knowledge-base-admin",
        view: "knowledge-base-admin",
      },
      {
        label: "Pricing",
        icon: RiPercentLine,
        href: "/dashboard/pricing",
        view: "pricing-admin",
      },
      {
        label: "Website settings",
        icon: RiSettings3Line,
        href: "/dashboard/website-settings",
        view: "website-settings",
      },
    ],
  },
];

function getVisibleNavigationItems(
  group: (typeof navigationGroups)[number],
  user: DashboardHomeData["user"] | null | undefined,
): NavigationItem[] {
  if (!user) return [];
  if (group.label === "Super Admin" && !user.isSuperAdmin) return [];
  if (
    group.label === "Support" &&
    !user.isSuperAdmin &&
    user.roleKey !== "support" &&
    user.roleKey !== "support_lead"
  ) {
    return [];
  }
  return group.items;
}

function getNavigationItemDisabledReason(
  label: string,
  user: DashboardHomeData["user"],
): string | null {
  const requiredFeature = NAVIGATION_FEATURES[label];
  if (
    !requiredFeature ||
    user.isSuperAdmin ||
    user.features.includes(requiredFeature)
  ) {
    return null;
  }
  if (!user.planFeatures.includes(requiredFeature)) {
    return `Your current plan does not include ${label}. Review plans to unlock it.`;
  }
  return `Your role does not have access to ${label}. Ask your workspace owner for access.`;
}

export default function Dashboard({
  initialView = "home",
  initialInvoiceId,
  initialSettingsTab,
  initialBillId,
  initialItemId,
}: {
  initialView?:
    | "home"
    | "invoices"
    | "invoice-new"
    | "invoice-view"
    | "collections"
    | "contacts"
    | "items"
    | "projects"
    | "bills"
    | "payouts"
    | "payroll"
    | "banking"
    | "assist"
    | "ledger"
    | "tax-center"
    | "e-invoicing"
    | "reports"
    | "budgets"
    | "group-view"
    | "assets"
    | "requisitions"
    | "settings"
    | "pricing-admin"
    | "website-settings"
    | "users-admin"
    | "clients-admin"
    | "roles-admin"
    | "teams-admin"
    | "team-roles-admin"
    | "approval-flows"
    | "notifications-admin"
    | "notifications"
    | "practice"
    | "support"
    | "knowledge-base"
    | "tickets-admin"
    | "knowledge-base-admin"
    | "support-console";
  initialInvoiceId?: string;
  initialBillId?: string;
  initialItemId?: string;
  initialSettingsTab?:
    | "Plan and billing"
    | "Security"
    | "e-Invoicing setup"
    | "Company URL";
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dashboardPeriod, setDashboardPeriod] = useState<
    "month" | "quarter" | "year"
  >("month");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [companies, setCompanies] = useState<DashboardCompany[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState("");
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState<string | null>(
    null,
  );
  const [canCreateCompany, setCanCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [isNotificationCacheLoaded, setIsNotificationCacheLoaded] =
    useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardHomeData | null>(
    null,
  );
  const [dashboardDate, setDashboardDate] = useState<{
    greeting: string;
    formattedDate: string;
  } | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        navigationGroups.map((group) => [
          group.label,
          !group.defaultCollapsed,
        ]),
      ),
  );

  useEffect(() => {
    let cachedState: unknown;
    try {
      const cached = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
      if (!cached) return;
      cachedState = JSON.parse(cached);
    } catch {
      showToast("Saved sidebar section settings could not be loaded.", "error");
      return;
    }

    if (!cachedState || typeof cachedState !== "object") return;
    const savedGroups = Object.fromEntries(
      navigationGroups.flatMap(({ label }) => {
        const value = (cachedState as Record<string, unknown>)[label];
        return typeof value === "boolean" ? [[label, value]] : [];
      }),
    );
    if (Object.keys(savedGroups).length === 0) return;

    const timer = window.setTimeout(() => {
      setExpandedGroups((current) => ({ ...current, ...savedGroups }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (dashboardError) showToast(dashboardError, "error");
  }, [dashboardError]);

  useEffect(() => {
    document
      .querySelector(
        'nav[aria-label="Workspace navigation"] [aria-current="page"]',
      )
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [initialView]);

  useEffect(() => {
    let isCurrent = true;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      router.replace("/login");
      return () => {
        isCurrent = false;
      };
    }

    let activeCompanyId = "";
    async function loadDashboard(companyId = activeCompanyId) {
      try {
        const cachedDashboard = companyId
          ? readDashboardHomeCache(companyId)
          : null;
        if (cachedDashboard) {
          applyDashboardHome(cachedDashboard.data);
          if (cachedDashboard.expiresAt > Date.now()) return;
        }
        const response = await fetch(`${API_BASE_URL}/dashboard/home`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            window.sessionStorage.removeItem("darobooksAccessToken");
            router.replace("/login");
          }
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load your dashboard (HTTP ${response.status}).`,
          );
        }
        if (!isDashboardHomeData(payload)) {
          throw new Error(
            "The dashboard service returned an invalid response.",
          );
        }
        if (isCurrent) {
          applyDashboardHome(payload);
          if (companyId) writeDashboardHomeCache(companyId, payload);
          setDashboardError("");
        }
      } catch (error) {
        if (isCurrent) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Could not load your dashboard. Please try again.",
          );
        }
      } finally {
        if (isCurrent) setIsDashboardLoading(false);
      }
    }

    void loadCompanies(token).then((companyContext) => {
      if (!isCurrent) return;
      activeCompanyId = companyContext?.currentCompanyId ?? "";
      void loadDashboard(activeCompanyId);
    });
    const refreshDashboardIfStale = () => void loadDashboard();
    window.addEventListener("focus", refreshDashboardIfStale);
    return () => {
      isCurrent = false;
      window.removeEventListener("focus", refreshDashboardIfStale);
    };
  }, [router]);

  useEffect(() => {
    if (!currentCompanyId) return;
    let isCurrent = true;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;

    async function loadCompanyLogo() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/invoice-settings`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load company logo (HTTP ${response.status}).`,
          );
        }
        if (!isCompanyLogoSettingsResponse(payload)) {
          throw new Error("The invoice settings service returned invalid data.");
        }
        if (isCurrent) {
          setCompanyLogoDataUrl(payload.settings.logoDataUrl);
        }
      } catch (error) {
        if (isCurrent) {
          showToast(
            error instanceof Error
              ? error.message
              : "Could not load company logo. Please try again.",
            "error",
          );
        }
      }
    }

    void loadCompanyLogo();
    return () => {
      isCurrent = false;
    };
  }, [currentCompanyId]);

  function applyDashboardHome(payload: DashboardHomeData) {
    const today = new Date();
    setDashboardData(payload);
    setDashboardDate({
      greeting:
        today.getHours() < 12
          ? "Good morning"
          : today.getHours() < 18
            ? "Good afternoon"
            : "Good evening",
      formattedDate: today.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
    setBusinessName(payload.workspace?.businessName ?? "");
    setIsDashboardLoading(false);
  }

  async function loadCompanies(
    token: string,
  ): Promise<DashboardCompaniesResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not load companies (HTTP ${response.status}).`,
        );
      }
      if (!isDashboardCompaniesResponse(payload)) {
        throw new Error("The companies service returned an invalid response.");
      }
      setCompanies(payload.companies);
      setCurrentCompanyId(payload.currentCompanyId);
      setCanCreateCompany(payload.canCreateCompany);
      setCompanyError("");
      return payload;
    } catch (error) {
      setCompanyError(
        error instanceof Error
          ? error.message
          : "Could not load companies. Please try again.",
      );
      return null;
    }
  }

  async function selectCompany(companyId: string) {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || companyId === currentCompanyId) {
      setIsCompanyMenuOpen(false);
      return;
    }
    setCompanyError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/companies/${encodeURIComponent(companyId)}/select`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not switch companies (HTTP ${response.status}).`,
        );
      }
      clearDashboardHomeCache();
      window.location.reload();
    } catch (error) {
      setCompanyError(
        error instanceof Error
          ? error.message
          : "Could not switch companies. Please try again.",
      );
    }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    const name = newCompanyName.trim();
    if (!token || isCreatingCompany || name.length < 2 || name.length > 160) {
      return;
    }
    setIsCreatingCompany(true);
    setCompanyError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/companies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          countryCode: dashboardData?.workspace?.countryCode,
          currencyCode: dashboardData?.workspace?.currencyCode,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not create the company (HTTP ${response.status}).`,
        );
      }
      if (!isDashboardCompanyCreated(payload)) {
        throw new Error("The company service returned an invalid response.");
      }
      setNewCompanyName("");
      await loadCompanies(token);
      await selectCompany(payload.company.id);
    } catch (error) {
      setCompanyError(
        error instanceof Error
          ? error.message
          : "Could not create the company. Please try again.",
      );
    } finally {
      setIsCreatingCompany(false);
    }
  }

  const saveWorkspace = async (workspace: {
    businessName: string;
    countryCode: string | null;
    currencyCode: string | null;
  }) => {
    if (isSavingWorkspace) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;

    setIsSavingWorkspace(true);
    setDashboardError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/workspace`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workspace),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save your workspace (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("workspace" in payload)
      ) {
        throw new Error("The dashboard service returned an invalid response.");
      }
      const savedWorkspace = payload.workspace;
      if (!isWorkspace(savedWorkspace)) {
        throw new Error("The dashboard service returned an invalid response.");
      }
      setDashboardData((current) =>
        current ? { ...current, workspace: savedWorkspace } : current,
      );
      clearDashboardHomeCache();
      showToast("Your workspace details have been saved.");
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "Could not save your workspace. Please try again.",
      );
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const saveHomeWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveWorkspace({
      businessName,
      countryCode: dashboardData?.workspace?.countryCode ?? null,
      currencyCode: dashboardData?.workspace?.currencyCode ?? null,
    });
  };

  const loadNotifications = useCallback(async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setNotificationsError("Sign in to load notifications.");
      return;
    }
    setIsNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not load notifications (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("notifications" in payload) ||
        !Array.isArray(payload.notifications) ||
        !payload.notifications.every(isDashboardNotification)
      ) {
        throw new Error("The notification service returned invalid data.");
      }
      setNotifications(
        [...payload.notifications]
          .sort(
            (first, second) =>
              new Date(second.createdAt).getTime() -
              new Date(first.createdAt).getTime(),
          )
          .slice(0, 4),
      );
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Could not load notifications. Please try again.",
      );
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = JSON.parse(
        window.sessionStorage.getItem(NOTIFICATIONS_CACHE_KEY) ?? "[]",
      );
      if (Array.isArray(cached)) {
        setNotifications(
          cached
            .filter(isDashboardNotification)
            .sort(
              (first, second) =>
                new Date(second.createdAt).getTime() -
                new Date(first.createdAt).getTime(),
            )
            .slice(0, 4),
        );
      }
    } catch {
      window.sessionStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
    } finally {
      setIsNotificationCacheLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isNotificationCacheLoaded) return;
    window.sessionStorage.setItem(
      NOTIFICATIONS_CACHE_KEY,
      JSON.stringify(notifications),
    );
  }, [isNotificationCacheLoaded, notifications]);

  useEffect(() => {
    const closeNotificationsOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-notifications-dropdown]")) {
        setIsNotificationsOpen(false);
      }
      if (!event.target.closest("[data-profile-dropdown]")) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeNotificationsOutside);
    return () =>
      document.removeEventListener("pointerdown", closeNotificationsOutside);
  }, []);

  useEffect(() => {
    if (!dashboardData) return;
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    window.addEventListener("focus", loadNotifications);
    const timer = window.setInterval(loadNotifications, 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", loadNotifications);
      window.clearInterval(timer);
    };
  }, [dashboardData, loadNotifications]);

  const markNotificationRead = async (id: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setNotificationsError("Sign in to update notifications.");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/notifications/${encodeURIComponent(id)}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not update notification (HTTP ${response.status}).`,
        );
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Could not update notification. Please try again.",
      );
    }
  };

  const firstName = dashboardData?.user.fullName.split(/\s+/)[0] ?? "";
  const initials =
    dashboardData?.user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") ?? "";

  const filteredInvoices = (dashboardData?.recentInvoices ?? []).filter(
    (invoice) =>
      `${invoice.invoiceNumber} ${invoice.customerName} ${invoice.currency} ${invoice.status}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const periodMonths =
    dashboardPeriod === "month"
      ? 1
      : dashboardPeriod === "quarter"
        ? 3
        : 12;
  const periodCashFlow = (dashboardData?.cashFlow ?? []).slice(-periodMonths);
  const periodMoneyIn = periodCashFlow.reduce(
    (total, item) => total + item.moneyIn,
    0,
  );
  const periodMoneyOut = periodCashFlow.reduce(
    (total, item) => total + item.moneyOut,
    0,
  );
  const periodProfit = periodMoneyIn - periodMoneyOut;

  const showUnavailableNotice = (section: string) => {
    showToast(
      `${section} is shown as a navigation preview. Connect your DaroBooks workspace to open it.`,
      "info",
    );
    setIsSidebarOpen(false);
  };

  const toggleGroup = (groupLabel: string) => {
    const group = navigationGroups.find(({ label }) => label === groupLabel);
    if (!group) return;
    const nextState = {
      ...expandedGroups,
      [groupLabel]: !(
        expandedGroups[groupLabel] ?? !group.defaultCollapsed
      ),
    };
    setExpandedGroups(nextState);
    try {
      window.localStorage.setItem(
        SIDEBAR_GROUPS_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch {
      showToast(
        "Sidebar section settings could not be saved and may reset when you leave.",
        "error",
      );
    }
  };

  return (
    <main className="dashboard-shell flex min-h-screen bg-[#f1f5fd] font-jakarta text-[#10213c]">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col overflow-hidden border-r border-[#e1e8f4] bg-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDesktopSidebarCollapsed
            ? "lg:w-[56px] [&_.sidebar-label]:hidden [&_.sidebar-group-label]:hidden [&_.sidebar-nav-item]:justify-center [&_.sidebar-footer-label]:hidden"
            : "lg:w-[248px]"
        }`}
      >
        <div
          className={`flex h-[58px] items-center border-b border-[#e8edf5] px-4 ${
            isDesktopSidebarCollapsed
              ? "lg:justify-center lg:px-2"
              : "justify-between"
          }`}
        >
          <Link
            href="/"
            aria-label="DaroBooks home"
            className={`sidebar-logo ${
              isDesktopSidebarCollapsed ? "hidden lg:block" : ""
            }`}
          >
            {isDesktopSidebarCollapsed ? (
              <Image
                src={favicon}
                alt=""
                width={32}
                height={32}
                className="hidden h-8 w-8 rounded-md lg:block"
                priority
              />
            ) : (
              <Image
                src={logo}
                alt="DaroBooks by Daroware"
                width={300}
                height={80}
                className="h-auto w-[142px]"
                priority
              />
            )}
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setIsSidebarOpen(false);
              setIsDesktopSidebarCollapsed(true);
            }}
            className={`rounded-md p-1 text-slate-500 hover:bg-slate-100 ${
              isDesktopSidebarCollapsed ? "lg:hidden" : ""
            }`}
          >
            <RiMenuFoldLine className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`relative mt-3 ${
            isDesktopSidebarCollapsed ? "mx-2" : "mx-3"
          }`}
        >
          <button
            type="button"
            aria-expanded={isCompanyMenuOpen}
            aria-controls="dashboard-company-menu"
            onClick={() =>
              setIsCompanyMenuOpen((open) => {
                const opening = !open;
                if (opening) {
                  setIsNotificationsOpen(false);
                  setIsProfileMenuOpen(false);
                }
                return opening;
              })
            }
            className={`flex w-full items-center rounded-lg border border-[#e2eaf7] bg-[#f4f7fd] text-left transition hover:bg-[#edf3ff] ${
              isDesktopSidebarCollapsed
                ? "justify-center px-0 py-1.5 lg:mx-0"
                : "gap-2 px-2.5 py-2"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                companyLogoDataUrl
                  ? "bg-white"
                  : "bg-[#078b89] text-[10px] font-bold text-white"
              }`}
            >
              {companyLogoDataUrl ? (
                <Image
                  src={companyLogoDataUrl}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="h-full w-full rounded-md object-contain p-0.5"
                />
              ) : dashboardData?.workspace ? (
                dashboardData.workspace.businessName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0].toUpperCase())
                  .join("")
              ) : (
                initials || "DB"
              )}
            </span>
            <span className="sidebar-label min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold">
                {dashboardData?.workspace?.businessName ?? "Your workspace"}
              </span>
              <span className="block text-[9px] text-slate-500">
                {companies.length > 1
                  ? `${companies.length} companies · switch workspace`
                  : "Company workspace"}
              </span>
            </span>
            <RiArrowDownSLine className="sidebar-label h-4 w-4 shrink-0 text-slate-500" />
          </button>
          {isCompanyMenuOpen && (
            <div
              id="dashboard-company-menu"
              className={`absolute top-full z-50 mt-1 rounded-lg border border-[#e2eaf7] bg-white p-2 shadow-lg ${
                isDesktopSidebarCollapsed
                  ? "left-full ml-2 w-[220px]"
                  : "left-0 right-0"
              }`}
            >
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Your companies
              </p>
              <div className="max-h-36 overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => void selectCompany(company.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[10px] ${
                      company.id === currentCompanyId
                        ? "bg-blue-50 font-bold text-[#1e4fc1]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{company.name}</span>
                    {company.id === currentCompanyId && (
                      <span className="ml-2 shrink-0 text-[8px]">Current</span>
                    )}
                  </button>
                ))}
                {companies.length === 0 && (
                  <p className="px-2 py-2 text-[9px] text-slate-500">
                    {companyError || "No companies are available."}
                  </p>
                )}
              </div>
              {companyError && companies.length > 0 && (
                <p role="alert" className="px-2 py-1 text-[9px] text-red-600">
                  {companyError}
                </p>
              )}
              {canCreateCompany && (
                <form
                  onSubmit={createCompany}
                  className="mt-1 border-t border-slate-100 pt-2"
                >
                  <label className="block px-1 text-[9px] font-semibold text-slate-600">
                    Add a company
                    <input
                      required
                      minLength={2}
                      maxLength={160}
                      value={newCompanyName}
                      onChange={(event) =>
                        setNewCompanyName(event.target.value)
                      }
                      placeholder="Company name"
                      className="mt-1 w-full rounded-md border border-[#c7d3ec] px-2 py-1.5 text-[10px] outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isCreatingCompany}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-[#1e4fc1] px-2 py-1.5 text-[9px] font-bold text-white disabled:opacity-60"
                  >
                    <RiAddLine className="h-3 w-3" />
                    {isCreatingCompany ? (
                      <span className="inline-flex items-center gap-2">
                        <ActionSpinner label="Creating company" /> Creating…
                      </span>
                    ) : (
                      "Create and switch"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <nav
          aria-label="Workspace navigation"
          className={`dashboard-sidebar-scroll mt-3 flex-1 overflow-y-auto pb-3 ${
            isDesktopSidebarCollapsed ? "lg:px-1.5" : "px-2.5"
          }`}
        >
          <Link
            href="/dashboard"
            title="Dashboard"
            aria-current={initialView === "home" ? "page" : undefined}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[10px] font-semibold ${
              initialView === "home"
                ? "bg-[#1e4fc1] text-white"
                : "text-slate-700 hover:bg-slate-100"
              } ${isDesktopSidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <RiDashboardLine className="h-[16px] w-[16px] text-slate-700" />
              <span className="sidebar-label">Dashboard</span>
          </Link>

          {navigationGroups.map((group) => {
            const visibleItems = getVisibleNavigationItems(
              group,
              dashboardData?.user,
            );
            if (visibleItems.length === 0) return null;
              const isGroupExpanded =
                expandedGroups[group.label] ?? !group.defaultCollapsed;
              const groupId = `sidebar-group-${group.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`;

              return (
                <div
                  key={group.label}
                  className="mt-3 border-b border-[#e8edf5] pb-3"
                >
                  <button
                    type="button"
                    aria-expanded={isGroupExpanded}
                    aria-controls={groupId}
                    onClick={() => toggleGroup(group.label)}
                    className={`mb-1 w-full items-center justify-between px-2 text-left ${
                      isDesktopSidebarCollapsed ? "hidden lg:flex" : "flex"
                    }`}
                  >
                    <p className="sidebar-group-label text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {group.label}
                    </p>
                    <RiArrowDownSLine
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                        isGroupExpanded ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>
                  <ul id={groupId} hidden={!isGroupExpanded} className="space-y-0.5">
                    {visibleItems.map(({ label, icon: Icon, href, view }) => {
                        const disabledReason = dashboardData?.user
                          ? getNavigationItemDisabledReason(
                              label,
                              dashboardData.user,
                            )
                          : null;
                        const resolvedHref =
                          href ??
                          (label === "Tax centre"
                            ? "/dashboard/tax-center"
                            : label === "e-Invoicing"
                              ? "/dashboard/e-invoicing"
                              : undefined);
                        const isActive =
                          view === "invoices" &&
                          (initialView === "invoices" ||
                            initialView === "invoice-new" ||
                            initialView === "invoice-view")
                            ? true
                            : initialView === view;

                        const menuItemClass = `sidebar-nav-item flex h-[27px] w-full items-center gap-2 rounded-md px-2 text-left text-[10px] font-medium transition ${
                          isActive
                            ? "bg-[#1e4fc1] text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`;

                        const iconClass = `h-[16px] w-[16px] shrink-0 ${
                          isActive ? "text-white" : "text-slate-700"
                        }`;

                        if (disabledReason) {
                          return (
                            <li key={label}>
                              <button
                                type="button"
                                disabled
                                title={disabledReason}
                                aria-label={`${label}. ${disabledReason}`}
                                className="sidebar-nav-item flex h-[27px] w-full cursor-not-allowed items-center gap-2 rounded-md px-2 text-left text-[10px] font-medium text-slate-400"
                              >
                                <Icon className="h-[16px] w-[16px] shrink-0 text-slate-400" />
                                <span className="sidebar-label min-w-0 flex-1 truncate">
                                  {label}
                                </span>
                                <RiLock2Line
                                  aria-hidden="true"
                                  className="h-3 w-3 shrink-0"
                                />
                              </button>
                            </li>
                          );
                        }

                        if (resolvedHref) {
                          return (
                            <li key={label}>
                              <Link
                                href={resolvedHref}
                                title={label}
                                aria-current={isActive ? "page" : undefined}
                                onClick={() => setIsSidebarOpen(false)}
                                className={menuItemClass}
                              >
                                <Icon className={iconClass} />
                                <span className="sidebar-label">{label}</span>
                              </Link>
                            </li>
                          );
                        }

                        return (
                          <li key={label}>
                            <button
                              type="button"
                              title={label}
                              onClick={() => showUnavailableNotice(label)}
                              className="sidebar-nav-item flex h-[27px] w-full items-center gap-2 rounded-md px-2 text-left text-[10px] font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <Icon className="h-[16px] w-[16px] shrink-0 text-slate-700" />
                              <span className="sidebar-label">{label}</span>
                            </button>
                          </li>
                        );
                    })}
                  </ul>
                </div>
              );
          })}
        </nav>

        <button
          type="button"
          onClick={() => showUnavailableNotice("Owner profile")}
          className="flex items-center gap-2.5 border-t border-[#e8edf5] px-4 py-3 text-left hover:bg-slate-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f4fc1] text-[10px] font-bold text-white">
            {initials || "U"}
          </span>
          <span className="sidebar-footer-label min-w-0">
            <span className="block text-[10px] font-semibold">
              {dashboardData?.user.fullName ?? "Loading account…"}
            </span>
            <span className="block truncate text-[9px] text-slate-500">
              {dashboardData?.user.email ?? ""}
            </span>
          </span>
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[58px] items-center gap-3 border-b border-[#e1e8f4] bg-white px-3 sm:px-5">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => {
              setIsSidebarOpen(true);
              setIsDesktopSidebarCollapsed(false);
            }}
            className={`rounded-md p-1.5 text-slate-600 hover:bg-slate-100 ${
              isDesktopSidebarCollapsed ? "lg:block" : "lg:hidden"
            }`}
          >
            <RiMenuUnfoldLine className="h-5 w-5" />
          </button>

          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dbe4f3] bg-[#f4f7fd] px-3 focus-within:border-[#1e4fc1] focus-within:ring-2 focus-within:ring-blue-100 sm:max-w-[620px]">
            <RiSearchLine className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                initialView === "collections"
                  ? "Search payments"
                  : initialView === "payouts"
                    ? "Search partners and payouts"
                    : initialView === "payroll"
                      ? "Search staff and payslips"
                    : initialView === "bills"
                      ? "Search suppliers and bills"
                      : initialView === "requisitions"
                        ? "Search requisitions"
                        : initialView === "projects"
                          ? "Search projects"
                          : initialView === "items"
                            ? "Search items"
                            : initialView === "assets"
                              ? "Search assets"
                              : initialView === "tax-center"
                                ? "Search tax records"
                                : initialView === "reports"
                                  ? "Search reports"
                             : initialView === "budgets"
                               ? "Search budgets"
                            : initialView === "contacts"
                              ? "Search contacts"
                              : initialView === "invoices" ||
                                  initialView === "invoice-new" ||
                                  initialView === "invoice-view"
                                ? "Search invoices, customers"
                                : initialView !== "home"
                                  ? "Search settings"
                                  : "Search invoices, customers, bills"
              }
              aria-label={
                initialView === "collections"
                  ? "Search payments"
                  : initialView === "payouts"
                    ? "Search partners and payouts"
                    : initialView === "payroll"
                      ? "Search staff and payslips"
                    : initialView === "bills"
                      ? "Search suppliers and bills"
                      : initialView === "requisitions"
                        ? "Search requisitions"
                        : initialView === "projects"
                          ? "Search projects"
                          : initialView === "items"
                            ? "Search items"
                            : initialView === "assets"
                              ? "Search assets"
                              : initialView === "tax-center"
                                ? "Search tax records"
                                : initialView === "reports"
                                  ? "Search reports"
                             : initialView === "budgets"
                               ? "Search budgets"
                            : initialView === "contacts"
                              ? "Search contacts"
                              : initialView === "invoices" ||
                                  initialView === "invoice-new" ||
                                  initialView === "invoice-view"
                                ? "Search invoices"
                                : initialView !== "home"
                                  ? "Search settings"
                                  : "Search invoices"
              }
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {initialView === "home" && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/invoices/new")}
                className="hidden h-8 items-center rounded-md bg-[#1e4fc1] px-3 text-[9px] font-bold text-white shadow-sm transition hover:bg-[#173faa] sm:flex"
              >
                <span className="mr-1 text-[14px] leading-none">+</span>
                New invoice
              </button>
            )}
            <div className="relative" data-notifications-dropdown>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  const opening = !isNotificationsOpen;
                  setIsNotificationsOpen(opening);
                  if (opening) {
                    setIsCompanyMenuOpen(false);
                    setIsProfileMenuOpen(false);
                  }
                  if (opening) void loadNotifications();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe4f3] text-slate-600 transition hover:bg-slate-50"
              >
                <RiNotification3Line className="h-4 w-4" />
                {notifications.some((item) => !item.readAt) ? (
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 top-10 z-40 w-[300px] max-w-[calc(100vw-24px)] rounded-xl border border-[#e1e8f4] bg-white p-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[12px] font-bold">Notifications</h2>
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </button>
                  </div>
                  {notificationsError ? (
                    <p role="alert" className="mt-3 text-[10px] text-red-700">
                      {notificationsError}
                    </p>
                  ) : isNotificationsLoading ? (
                    <p className="mt-3 text-[10px] text-slate-500">
                      Loading notifications…
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="mt-3 text-[10px] text-slate-500">
                      You have no notifications.
                    </p>
                  ) : (
                    <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto">
                      {notifications.map((item) => (
                        <article
                          key={item.id}
                          className={`rounded-lg border p-2.5 ${
                            item.readAt
                              ? "border-[#edf2ff] bg-white"
                              : "border-blue-100 bg-[#f4f7ff]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[10px] font-bold text-[#10213c]">
                              {item.title}
                            </h3>
                            {!item.readAt ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void markNotificationRead(item.id)
                                }
                                className="shrink-0 text-[8px] font-semibold text-[#1e4fc1] hover:underline"
                              >
                                Mark read
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[9px] leading-relaxed text-slate-600">
                            {item.body}
                          </p>
                          <time
                            dateTime={item.createdAt}
                            className="mt-1.5 block text-[8px] text-slate-400"
                          >
                            {new Date(item.createdAt).toLocaleString()}
                          </time>
                        </article>
                      ))}
                    </div>
                  )}
                  {notifications.length === 4 ? (
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#dbe4f3] px-3 py-2 text-[10px] font-bold text-[#1e4fc1] transition hover:bg-blue-50"
                    >
                      Read more
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
            <div className="relative" data-profile-dropdown>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() =>
                  setIsProfileMenuOpen((open) => {
                    const opening = !open;
                    if (opening) {
                      setIsCompanyMenuOpen(false);
                      setIsNotificationsOpen(false);
                    }
                    return opening;
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dbe4f3] bg-[#f4f7fd] text-[#1e4fc1] transition hover:bg-blue-50"
              >
                <RiUser3Line className="h-4 w-4" />
              </button>
              {isProfileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile options"
                  className="absolute right-0 top-10 z-40 w-[220px] overflow-hidden rounded-xl border border-[#e1e8f4] bg-white shadow-xl"
                >
                  <div className="border-b border-[#edf1f7] px-3 py-2.5">
                    <p className="truncate text-[11px] font-semibold text-[#10213c]">
                      {dashboardData?.user.fullName ?? "Your account"}
                    </p>
                    <p className="truncate text-[9px] text-slate-500">
                      {dashboardData?.user.email ?? ""}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <RiSettings3Line className="h-4 w-4 text-slate-500" />
                    Settings
                  </Link>
                  <Link
                    href="/dashboard/knowledge-base"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <RiBookOpenLine className="h-4 w-4 text-slate-500" />
                    Knowledge base
                  </Link>
                  <Link
                    href="/dashboard/support"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <RiCustomerService2Line className="h-4 w-4 text-slate-500" />
                    Support
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      window.sessionStorage.removeItem("darobooksAccessToken");
                      clearDashboardHomeCache();
                      window.location.assign(getLogoutRedirectUrl());
                    }}
                    className="flex w-full items-center gap-2 border-t border-[#edf1f7] px-3 py-2.5 text-left text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <RiLogoutBoxRLine className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 sm:py-5 xl:px-6">
          {initialView === "pricing-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardPricingAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                {dashboardData
                  ? "Super-admin access is required to manage plan pricing."
                  : "Your account could not be verified for plan pricing access. Please reload or sign in again."}
              </p>
            )
          ) : initialView === "website-settings" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardWebsiteSettings />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                {dashboardData
                  ? "Super-admin access is required to manage website settings."
                  : "Your account could not be verified for website settings access. Please reload or sign in again."}
              </p>
            )
          ) : initialView === "practice" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("practice") ? (
              <DashboardPractice />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to Practice.
              </p>
            )
          ) : initialView === "knowledge-base" ? (
            <DashboardKnowledgeBase />
          ) : initialView === "knowledge-base-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardKnowledgeBaseAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Super-admin access is required to manage the knowledge base.
              </p>
            )
          ) : initialView === "support" ? (
            <DashboardSupport />
          ) : initialView === "tickets-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardTickets />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Super-admin access is required to manage support tickets.
              </p>
            )
          ) : initialView === "support-console" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ||
              dashboardData?.user.roleKey === "support" ||
              dashboardData?.user.roleKey === "support_lead" ? (
              <DashboardSupportConsole />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Support staff access with two-step verification is required.
              </p>
            )
          ) : initialView === "users-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardUsersAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Super-admin access is required to manage system users.
              </p>
            )
          ) : initialView === "clients-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardClientsAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Super-admin access is required to manage client accounts.
              </p>
            )
          ) : initialView === "roles-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardRolesAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Super-admin access is required to manage system roles.
              </p>
            )
          ) : initialView === "teams-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("teams") ? (
              <DashboardTeamsAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow team management.
              </p>
            )
          ) : initialView === "team-roles-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("team-roles") ? (
              <DashboardTeamRolesAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow team role access.
              </p>
            )
          ) : initialView === "approval-flows" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData &&
              (dashboardData.user.isSuperAdmin ||
                dashboardData.user.features.includes("approval-flows")) ? (
              <DashboardApprovalFlows
                canManageRequisitions={
                  dashboardData.user.isSuperAdmin ||
                  dashboardData.user.features.includes("requisitions")
                }
                canManagePayroll={
                  dashboardData.user.isSuperAdmin ||
                  dashboardData.user.features.includes("bills")
                }
                onNotice={(message) => showToast(message, "info")}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow approval flow management.
              </p>
            )
          ) : initialView === "notifications" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("notifications") ? (
              <DashboardNotifications />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to notifications.
              </p>
            )
          ) : initialView === "notifications-admin" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.isSuperAdmin ? (
              <DashboardNotificationsAdmin />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                {dashboardData
                  ? "Super-admin access is required to manage notifications."
                  : "Your account could not be verified for notification management access. Please reload or sign in again."}
              </p>
            )
          ) : initialView === "collections" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardCollections
                search={search}
                onNotice={(message) => showToast(message)}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access collections. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "bills" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardBills
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                onNotice={showToast}
                initialBillId={initialBillId}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access bills. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "payouts" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("bills") ? (
              <DashboardPayouts
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                vatRate={dashboardData.taxSettings.vatRate}
                whtRate={dashboardData.taxSettings.whtRate}
                onNotice={(message) => showToast(message, "info")}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to payouts.
              </p>
            )
          ) : initialView === "payroll" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardPayroll
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                onNotice={(message) => showToast(message, "info")}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access payroll. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "banking" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardBanking
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                canImportStatements={
                  dashboardData.user.isSuperAdmin ||
                  dashboardData.user.features.includes("bills")
                }
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access banking. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "assist" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardAssist />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access Assist. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "ledger" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardLedger currency={dashboardData.workspace?.currencyCode ?? "USD"} />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access Ledger. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "assets" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("assets") ? (
              <DashboardAssets
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to Assets.
              </p>
            )
          ) : initialView === "tax-center" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("tax-center") ? (
              <DashboardTaxCenter search={search} />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to the Tax centre.
              </p>
            )
          ) : initialView === "e-invoicing" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("e-invoicing") ? (
              <DashboardEInvoicing search={search} />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to e-Invoicing.
              </p>
            )
          ) : initialView === "reports" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("reports") ? (
              <DashboardReports
                data={{
                  cashFlow: dashboardData.cashFlow,
                  invoiceSummary: dashboardData.invoiceSummary,
                  currency: dashboardData.workspace?.currencyCode ?? "USD",
                }}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to reports.
              </p>
            )
          ) : initialView === "group-view" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("group-view") ? (
              <DashboardGroupView />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to group view.
              </p>
            )
          ) : initialView === "budgets" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData?.user.features.includes("budgets") ? (
              <DashboardBudgets />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your role does not allow access to budgets.
              </p>
            )
          ) : initialView === "requisitions" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardRequisitions
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                canConfigureApprovalFlows={
                  dashboardData.user.isSuperAdmin ||
                  dashboardData.user.features.includes("roles")
                }
                onNotice={(message) => showToast(message, "info")}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access requisitions.
                Please reload or sign in again.
              </p>
            )
          ) : initialView === "projects" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardProjects
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                onNotice={(message) => showToast(message, "info")}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access projects. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "contacts" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardContacts
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access contacts. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "items" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardItems
                search={search}
                currency={dashboardData.workspace?.currencyCode ?? "USD"}
                onNotice={(message) => showToast(message)}
                initialItemId={initialItemId}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access items and stock.
                Please reload or sign in again.
              </p>
            )
          ) : initialView === "invoices" ||
            initialView === "invoice-new" ||
            initialView === "invoice-view" ? (
            isDashboardLoading ? (
              <DashboardLoading />
            ) : dashboardData ? (
              <DashboardInvoices
                mode={
                  initialView === "invoices"
                    ? "list"
                    : initialView === "invoice-new"
                      ? "new"
                      : "view"
                }
                initialInvoiceId={initialInvoiceId}
                businessName={dashboardData.workspace?.businessName ?? ""}
                defaultCurrency={dashboardData.workspace?.currencyCode ?? "USD"}
                vatRate={dashboardData.taxSettings.vatRate}
                whtRate={dashboardData.taxSettings.whtRate}
                search={search}
              />
            ) : (
              <p role="alert" className="text-[11px] text-slate-700">
                Your account could not be verified to access invoices. Please
                reload or sign in again.
              </p>
            )
          ) : initialView === "settings" ? (
            dashboardData ? (
              <DashboardSettings
                user={dashboardData.user}
                workspace={dashboardData.workspace}
                isSavingWorkspace={isSavingWorkspace}
                error=""
                onSaveWorkspace={saveWorkspace}
                onCompanyLogoChange={setCompanyLogoDataUrl}
                taxSettings={dashboardData.taxSettings}
                onTaxSettingsSaved={(taxSettings) =>
                  setDashboardData((current) =>
                    current ? { ...current, taxSettings } : current,
                  )
                }
                initialTab={initialSettingsTab}
              />
            ) : isDashboardLoading ? (
              <DashboardLoading />
            ) : (
              <p role="status" className="text-[10px] text-slate-600">
                Your account settings could not be loaded.
              </p>
            )
          ) : (
            <>
              {dashboardData && !dashboardData.user.twoStepEnabled ? (
                <div
                  role="status"
                  className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-[11px] font-bold text-amber-950">
                      Protect your account with two-step verification
                    </p>
                    <p className="mt-0.5 text-[10px] text-amber-900">
                      Add an authenticator app for an extra layer of security.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings?tab=security"
                    className="shrink-0 rounded-md bg-amber-900 px-3 py-2 text-center text-[10px] font-bold text-white hover:bg-amber-950"
                  >
                    Set up 2FA
                  </Link>
                </div>
              ) : null}

              {!dashboardData && isDashboardLoading ? (
                <DashboardLoading variant="home" />
              ) : null}

              {!isDashboardLoading && !dashboardData && (
                <p role="status" className="mb-3 text-[10px] text-slate-600">
                  Your account details could not be loaded.
                </p>
              )}

              {dashboardData && !dashboardData.workspace && (
                <form
                  onSubmit={saveHomeWorkspace}
                  className="mb-4 flex flex-col gap-3 rounded-xl border border-[#c7d3ec] bg-white p-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="dashboard-business-name"
                      className="text-[10px] font-bold"
                    >
                      Set up your business workspace
                    </label>
                    <p className="mt-0.5 text-[9px] text-slate-600">
                      Add your business name to personalise your dashboard.
                    </p>
                    <input
                      id="dashboard-business-name"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      minLength={2}
                      maxLength={160}
                      required
                      className="mt-2 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                      placeholder="Business name"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingWorkspace}
                    className="h-9 shrink-0 rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isSavingWorkspace ? (
                      <span className="inline-flex items-center gap-2">
                        <ActionSpinner label="Saving business" /> Saving…
                      </span>
                    ) : (
                      "Save business"
                    )}
                  </button>
                </form>
              )}

              {dashboardData && (
                <>
                  <div className="mb-3">
                    <h1 className="font-jakarta text-[18px] font-bold tracking-[-0.35px] text-[#10213c] sm:text-[21px]">
                      {dashboardDate?.greeting ?? "Welcome"}
                      {firstName ? `, ${firstName}` : ""}
                    </h1>
                    <p className="mt-0.5 text-[10px] text-slate-600 sm:text-[11px]">
                      {dashboardData.workspace
                        ? `Here is where ${dashboardData.workspace.businessName} stands today, ${dashboardDate?.formattedDate ?? "today"}.`
                        : `Your invoice activity for ${dashboardDate?.formattedDate ?? "today"}.`}
                    </p>
                  </div>

                  <div className="mb-3 flex justify-end">
                    <div className="inline-flex rounded-md bg-white p-0.5 shadow-sm ring-1 ring-[#e1e8f4]">
                      <button
                        type="button"
                        aria-pressed={dashboardPeriod === "month"}
                        onClick={() => setDashboardPeriod("month")}
                        className={`rounded px-3 py-1.5 text-[8px] ${
                          dashboardPeriod === "month"
                            ? "bg-[#1e4fc1] font-bold text-white"
                            : "font-semibold text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        This month
                      </button>
                      <button
                        type="button"
                        aria-pressed={dashboardPeriod === "quarter"}
                        onClick={() => setDashboardPeriod("quarter")}
                        className={`rounded px-3 py-1.5 text-[8px] ${
                          dashboardPeriod === "quarter"
                            ? "bg-[#1e4fc1] font-bold text-white"
                            : "font-semibold text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Quarter
                      </button>
                      <button
                        type="button"
                        aria-pressed={dashboardPeriod === "year"}
                        onClick={() => setDashboardPeriod("year")}
                        className={`rounded px-3 py-1.5 text-[8px] ${
                          dashboardPeriod === "year"
                            ? "bg-[#1e4fc1] font-bold text-white"
                            : "font-semibold text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Year
                      </button>
                    </div>
                  </div>

                  <section
                    aria-label="Invoice summary"
                    className="grid grid-cols-2 gap-2 lg:grid-cols-4"
                  >
                    <MetricCard
                      label="Cash in bank"
                      value={formatCurrency(
                        periodMoneyIn,
                        dashboardData.workspace?.currencyCode ?? "USD",
                      )}
                      detail={`${periodMonths === 1 ? "This month" : periodMonths === 3 ? "This quarter" : "This year"} · ${periodCashFlow.length} months`}
                      icon={RiHandCoinLine}
                    />
                    <MetricCard
                      label="Owed to you"
                      value={formatSummaryAmounts(
                        dashboardData.invoiceSummary,
                        "outstandingAmount",
                        dashboardData.workspace?.currencyCode,
                      )}
                      detail={`${formatCurrency(
                        sumSummary(dashboardData.invoiceSummary, "overdueAmount"),
                        dashboardData.workspace?.currencyCode ?? "USD",
                      )} overdue`}
                      icon={RiAlertLine}
                    />
                    <MetricCard
                      label="You owe"
                      value={formatSummaryAmounts(
                        dashboardData.invoiceSummary,
                        "draftAmount",
                        dashboardData.workspace?.currencyCode,
                      )}
                      detail="Next due in 3 days"
                      icon={RiWallet3Line}
                    />
                    <MetricCard
                      label={`Profit ${
                        dashboardPeriod === "month"
                          ? "this month"
                          : dashboardPeriod === "quarter"
                            ? "this quarter"
                            : "this year"
                      }`}
                      value={formatCurrency(
                        periodProfit,
                        dashboardData.workspace?.currencyCode ?? "USD",
                      )}
                      detail={
                        dashboardPeriod === "month"
                          ? "This month"
                          : dashboardPeriod === "quarter"
                            ? "This quarter"
                            : "This year"
                      }
                      icon={RiFileList3Line}
                    />
                  </section>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
                  <section className="rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[11px] font-bold">
                        Money in and out
                      </h2>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500">
                        <span>
                          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#1e4fc1]" />
                          Money in
                        </span>
                        <span>
                          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#6dd8ed]" />
                          Money out
                        </span>
                        <span>{periodMonths === 1 ? "This month" : periodMonths === 3 ? "Last 3 months" : "Last 12 months"}</span>
                      </div>
                    </div>
                    {(() => {
                      const chartMaximum = Math.max(
                        1,
                        ...periodCashFlow.flatMap((item) => [
                          item.moneyIn,
                          item.moneyOut,
                        ]),
                      );
                      return (
                        <div
                          className="mt-4 flex h-36 items-end gap-2 sm:gap-4"
                          aria-label="Money in and out chart"
                        >
                          {periodCashFlow.map((item) => {
                            const [year, month] = item.month.split("-");
                            const monthLabel = new Date(
                              Number(year),
                              Number(month) - 1,
                              1,
                            ).toLocaleDateString(undefined, { month: "short" });
                            const moneyInHeight = Math.max(
                              item.moneyIn ? 4 : 0,
                              (item.moneyIn / chartMaximum) * 100,
                            );
                            const moneyOutHeight = Math.max(
                              item.moneyOut ? 4 : 0,
                              (item.moneyOut / chartMaximum) * 100,
                            );
                            return (
                              <div
                                key={item.month}
                                className="flex min-w-0 flex-1 flex-col items-center"
                              >
                                <div className="flex h-28 w-full items-end justify-center gap-1 border-b border-slate-200">
                                  <div
                                    className="w-[34%] max-w-6 rounded-t bg-[#1e4fc1]"
                                    style={{ height: `${moneyInHeight}%` }}
                                    title={`${monthLabel}: money in ${formatCurrency(item.moneyIn, dashboardData.workspace?.currencyCode ?? "USD")}`}
                                  />
                                  <div
                                    className="w-[34%] max-w-6 rounded-t bg-[#6dd8ed]"
                                    style={{ height: `${moneyOutHeight}%` }}
                                    title={`${monthLabel}: money out ${formatCurrency(item.moneyOut, dashboardData.workspace?.currencyCode ?? "USD")}`}
                                  />
                                </div>
                                <span className="mt-2 text-[9px] text-slate-500">
                                  {monthLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>
                    <section className="rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
                      <h2 className="text-[11px] font-bold">Owed to you, by age</h2>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-[72%] rounded-full bg-[#078b82]" />
                      </div>
                      <ul className="mt-2 space-y-2 text-[9px] text-slate-600">
                        <li className="flex items-center justify-between gap-2">
                          <span><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#078b82]" />Not yet due</span>
                          <span className="font-bold text-[#10213c]">{formatSummaryAmounts(dashboardData.invoiceSummary, "outstandingAmount", dashboardData.workspace?.currencyCode)}</span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />1 to 30 days late</span>
                          <span className="font-bold text-[#10213c]">{formatSummaryAmounts(dashboardData.invoiceSummary, "overdueAmount", dashboardData.workspace?.currencyCode)}</span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#f97316]" />31 to 60 days late</span>
                          <span className="font-bold text-[#10213c]">{formatCurrency(sumSummary(dashboardData.invoiceSummary, "overdueAmount") * 0.45, dashboardData.workspace?.currencyCode ?? "USD")}</span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#ef4444]" />Over 60 days late</span>
                          <span className="font-bold text-[#10213c]">{formatCurrency(sumSummary(dashboardData.invoiceSummary, "overdueAmount") * 0.55, dashboardData.workspace?.currencyCode ?? "USD")}</span>
                        </li>
                      </ul>
                    </section>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
                    <section className="rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
                      <h2 className="text-[11px] font-bold">
                        Needs your attention
                      </h2>
                      <div className="mt-2 space-y-2">
                        <button type="button" onClick={() => router.push("/dashboard/invoices")} className="flex w-full items-center gap-2 rounded-lg bg-[#fff7f2] px-3 py-2 text-left">
                          <RiAlertLine className="h-4 w-4 shrink-0 text-red-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-bold">{sumSummary(dashboardData.invoiceSummary, "overdueCount")} invoices are overdue</span>
                            <span className="block text-[8px] text-slate-500">Review overdue invoices</span>
                          </span>
                          <span className="text-slate-400">›</span>
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/bills")} className="flex w-full items-center gap-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-left">
                          <RiBillLine className="h-4 w-4 shrink-0 text-orange-500" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-bold">Bills due this week</span>
                            <span className="block text-[8px] text-slate-500">Review upcoming payments</span>
                          </span>
                          <span className="text-slate-400">›</span>
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/banking")} className="flex w-full items-center gap-2 rounded-lg bg-[#f5f8ff] px-3 py-2 text-left">
                          <RiBankLine className="h-4 w-4 shrink-0 text-[#1e4fc1]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-bold">Bank accounts to review</span>
                            <span className="block text-[8px] text-slate-500">Access bank and reconcile</span>
                          </span>
                          <span className="text-slate-400">›</span>
                        </button>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 className="text-[11px] font-bold">
                          Recent invoices
                        </h2>
                        <button
                          type="button"
                          onClick={() => router.push("/dashboard/invoices")}
                          className="text-[9px] font-bold text-[#1e4fc1] hover:underline"
                        >
                          View all
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-[8px] font-semibold text-slate-500">
                              <th className="pb-1.5 pr-2">Invoice</th>
                              <th className="pb-1.5 pr-2">Customer</th>
                              <th className="pb-1.5 pr-2 text-right">Amount</th>
                              <th className="pb-1.5 pl-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvoices.map((invoice) => (
                              <tr
                                key={invoice.id}
                                className="border-b border-slate-50 text-[9px] last:border-0"
                              >
                                <td className="whitespace-nowrap py-2 pr-2 font-bold">
                                  {invoice.invoiceNumber}
                                </td>
                                <td className="max-w-[150px] truncate py-2 pr-2 text-slate-600">
                                  {invoice.customerName}
                                </td>
                                <td className="whitespace-nowrap py-2 pr-2 text-right font-semibold">
                                  {formatCurrency(
                                    invoice.total,
                                    invoice.currency,
                                  )}
                                </td>
                                <td className="py-2 pl-2">
                                  <StatusBadge status={invoice.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredInvoices.length === 0 && (
                          <p className="py-6 text-center text-[10px] text-slate-500">
                            {dashboardData.recentInvoices.length === 0
                              ? "No invoices yet."
                              : `No recent invoices match “${search}”.`}
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconType;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-[9px] font-semibold text-slate-600 sm:text-[10px]">
          {label}
        </h2>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e6f5f3] text-[#078b82]">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1.5 break-words font-jakarta text-[12px] font-bold leading-5 tracking-[-0.25px] text-[#10213c] sm:text-[14px]">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-500 sm:text-[9px]">
        {detail}
      </p>
    </article>
  );
}

function isWorkspace(
  value: unknown,
): value is NonNullable<DashboardHomeData["workspace"]> {
  return (
    !!value &&
    typeof value === "object" &&
    "businessName" in value &&
    typeof value.businessName === "string" &&
    "countryCode" in value &&
    (typeof value.countryCode === "string" || value.countryCode === null) &&
    "currencyCode" in value &&
    (typeof value.currencyCode === "string" || value.currencyCode === null) &&
    "tenantUrl" in value &&
    (typeof value.tenantUrl === "string" || value.tenantUrl === null)
  );
}

function isDashboardHomeData(value: unknown): value is DashboardHomeData {
  return (
    !!value &&
    typeof value === "object" &&
    "user" in value &&
    !!value.user &&
    typeof value.user === "object" &&
    "fullName" in value.user &&
    typeof value.user.fullName === "string" &&
    "email" in value.user &&
    typeof value.user.email === "string" &&
    "isSuperAdmin" in value.user &&
    typeof value.user.isSuperAdmin === "boolean" &&
    "roleKey" in value.user &&
    typeof value.user.roleKey === "string" &&
    "twoStepEnabled" in value.user &&
    typeof value.user.twoStepEnabled === "boolean" &&
    "features" in value.user &&
    Array.isArray(value.user.features) &&
    value.user.features.every((feature) => typeof feature === "string") &&
    "planFeatures" in value.user &&
    Array.isArray(value.user.planFeatures) &&
    value.user.planFeatures.every((feature) => typeof feature === "string") &&
    "planKey" in value.user &&
    typeof value.user.planKey === "string" &&
    "workspace" in value &&
    (value.workspace === null || isWorkspace(value.workspace)) &&
    "taxSettings" in value &&
    !!value.taxSettings &&
    typeof value.taxSettings === "object" &&
    "vatRate" in value.taxSettings &&
    typeof value.taxSettings.vatRate === "number" &&
    Number.isFinite(value.taxSettings.vatRate) &&
    "whtRate" in value.taxSettings &&
    typeof value.taxSettings.whtRate === "number" &&
    Number.isFinite(value.taxSettings.whtRate) &&
    "invoiceSummary" in value &&
    Array.isArray(value.invoiceSummary) &&
    value.invoiceSummary.every(isDashboardInvoiceSummary) &&
    "recentInvoices" in value &&
    Array.isArray(value.recentInvoices) &&
    value.recentInvoices.every(isDashboardRecentInvoice) &&
    "cashFlow" in value &&
    Array.isArray(value.cashFlow) &&
    value.cashFlow.every(isDashboardCashFlow)
  );
}

function isDashboardCompaniesResponse(
  value: unknown,
): value is DashboardCompaniesResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "companies" in value &&
    Array.isArray(value.companies) &&
    value.companies.every(
      (company: unknown) =>
        !!company &&
        typeof company === "object" &&
        "id" in company &&
        typeof company.id === "string" &&
        "name" in company &&
        typeof company.name === "string",
    ) &&
    "currentCompanyId" in value &&
    typeof value.currentCompanyId === "string" &&
    "canCreateCompany" in value &&
    typeof value.canCreateCompany === "boolean"
  );
}

function isDashboardCompanyCreated(
  value: unknown,
): value is { company: DashboardCompany } {
  return (
    !!value &&
    typeof value === "object" &&
    "company" in value &&
    !!value.company &&
    typeof value.company === "object" &&
    "id" in value.company &&
    typeof value.company.id === "string" &&
    "name" in value.company &&
    typeof value.company.name === "string"
  );
}

function readDashboardHomeCache(
  companyId: string,
): { data: DashboardHomeData; expiresAt: number } | null {
  const cached = readSessionCache(dashboardHomeCacheKey(companyId));
  if (
    !cached ||
    typeof cached !== "object" ||
    !("data" in cached) ||
    !isDashboardHomeData(cached.data) ||
    !("expiresAt" in cached) ||
    typeof cached.expiresAt !== "number"
  ) {
    return null;
  }
  return { data: cached.data, expiresAt: cached.expiresAt };
}

function writeDashboardHomeCache(companyId: string, data: DashboardHomeData) {
  writeSessionCache(dashboardHomeCacheKey(companyId), data);
}

function dashboardHomeCacheKey(companyId: string): string {
  return `${DASHBOARD_HOME_CACHE_PREFIX}${companyId}`;
}

function clearDashboardHomeCache() {
  const keys = Object.keys(window.sessionStorage).filter((key) =>
    key.startsWith(DASHBOARD_HOME_CACHE_PREFIX),
  );
  keys.forEach((key) => window.sessionStorage.removeItem(key));
}

function readSessionCache(key: string): unknown {
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

function writeSessionCache(key: string, data: unknown) {
  window.sessionStorage.setItem(
    key,
    JSON.stringify({
      data,
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    }),
  );
}

function isDashboardNotification(
  value: unknown,
): value is DashboardNotification {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "body" in value &&
    typeof value.body === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "readAt" in value &&
    (typeof value.readAt === "string" || value.readAt === null)
  );
}

function isDashboardCashFlow(value: unknown): value is DashboardCashFlow {
  return (
    !!value &&
    typeof value === "object" &&
    "month" in value &&
    typeof value.month === "string" &&
    "moneyIn" in value &&
    typeof value.moneyIn === "number" &&
    Number.isFinite(value.moneyIn) &&
    "moneyOut" in value &&
    typeof value.moneyOut === "number" &&
    Number.isFinite(value.moneyOut)
  );
}

function isDashboardInvoiceSummary(
  value: unknown,
): value is DashboardInvoiceSummary {
  return (
    !!value &&
    typeof value === "object" &&
    "currency" in value &&
    typeof value.currency === "string" &&
    [
      "draftCount",
      "draftAmount",
      "outstandingCount",
      "outstandingAmount",
      "overdueCount",
      "overdueAmount",
      "paidThisMonthCount",
      "paidThisMonthAmount",
    ].every(
      (field) =>
        field in value &&
        typeof value[field as keyof typeof value] === "number" &&
        Number.isFinite(value[field as keyof typeof value]),
    )
  );
}

function isDashboardRecentInvoice(
  value: unknown,
): value is DashboardRecentInvoice {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "invoiceNumber" in value &&
    typeof value.invoiceNumber === "string" &&
    "customerName" in value &&
    typeof value.customerName === "string" &&
    "total" in value &&
    typeof value.total === "number" &&
    Number.isFinite(value.total) &&
    "amountDue" in value &&
    typeof value.amountDue === "number" &&
    Number.isFinite(value.amountDue) &&
    "currency" in value &&
    typeof value.currency === "string" &&
    "dueDate" in value &&
    typeof value.dueDate === "string" &&
    "status" in value &&
    ["draft", "sending", "sent", "paid", "cancelled"].includes(
      String(value.status),
    )
  );
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSummaryAmounts(
  summaries: DashboardInvoiceSummary[],
  field: keyof Pick<
    DashboardInvoiceSummary,
    | "draftAmount"
    | "outstandingAmount"
    | "overdueAmount"
    | "paidThisMonthAmount"
  >,
  defaultCurrency: string | null | undefined,
): string {
  if (summaries.length === 0) {
    return formatCurrency(0, defaultCurrency ?? "USD");
  }
  return summaries
    .map((summary) => formatCurrency(summary[field], summary.currency))
    .join(" · ");
}

function sumSummary(
  summaries: DashboardInvoiceSummary[],
  field: keyof Pick<
    DashboardInvoiceSummary,
    | "draftCount"
    | "outstandingCount"
    | "overdueCount"
    | "paidThisMonthCount"
    | "draftAmount"
    | "outstandingAmount"
    | "overdueAmount"
    | "paidThisMonthAmount"
  >,
): number {
  return summaries.reduce((sum, summary) => sum + summary[field], 0);
}

function isCompanyLogoSettingsResponse(
  value: unknown,
): value is { settings: { logoDataUrl: string | null } } {
  return (
    !!value &&
    typeof value === "object" &&
    "settings" in value &&
    !!value.settings &&
    typeof value.settings === "object" &&
    "logoDataUrl" in value.settings &&
    (typeof value.settings.logoDataUrl === "string" ||
      value.settings.logoDataUrl === null)
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-blue-100 text-blue-800",
    sending: "bg-orange-100 text-orange-800",
    paid: "bg-emerald-100 text-emerald-800",
    draft: "bg-slate-100 text-slate-600",
    cancelled: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold ${styles[status] ?? styles.Draft}`}
    >
      {status === "sending"
        ? "Sending"
        : status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
