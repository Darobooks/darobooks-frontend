export const roleAccessSections = [
  {
    label: "Dashboard",
    features: [{ key: "dashboard", label: "Dashboard" }],
  },
  {
    label: "Sales",
    features: [
      { key: "invoices", label: "Invoices" },
      { key: "e-invoicing", label: "e-Invoicing" },
      { key: "collections", label: "Collections" },
      { key: "contacts", label: "Contacts" },
      { key: "items", label: "Items and stock" },
      { key: "projects", label: "Projects" },
    ],
  },
  {
    label: "Spending",
    features: [
      { key: "bills", label: "Bills" },
      { key: "requisitions", label: "Requisitions" },
      { key: "payouts", label: "Payouts" },
      { key: "payroll", label: "Payroll" },
      { key: "budgets", label: "Budgets" },
    ],
  },
  {
    label: "Banking",
    features: [
      { key: "banking", label: "Banking" },
      { key: "assist", label: "Assist" },
    ],
  },
  {
    label: "Accounting",
    features: [
      { key: "ledger", label: "Ledger" },
      { key: "assets", label: "Assets" },
      { key: "tax-center", label: "Tax centre" },
    ],
  },
  {
    label: "Insights",
    features: [
      { key: "reports", label: "Reports" },
      { key: "group-view", label: "Group view" },
    ],
  },
  {
    label: "Workspace",
    features: [
      { key: "practice", label: "Practice" },
      { key: "settings", label: "Settings" },
      { key: "notifications", label: "Notifications" },
    ],
  },
  {
    label: "Teams",
    features: [
      { key: "teams", label: "Teams" },
      { key: "team-roles", label: "Team roles" },
      { key: "approval-flows", label: "Approval flows" },
      { key: "users", label: "Company management" },
      { key: "roles", label: "Approval role management" },
    ],
  },
] as const;
