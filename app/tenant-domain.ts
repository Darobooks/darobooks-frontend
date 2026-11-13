const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
  ?.trim()
  .toLowerCase()
  .split(":")[0];

export function getTenantBaseDomain(hostname: string): string {
  return (
    TENANT_BASE_DOMAIN ||
    (hostname === "localhost" || hostname.endsWith(".localhost")
      ? "localhost"
      : "darobooks.com")
  );
}

export function getTenantSlug(hostname: string): string | null {
  const host = hostname.toLowerCase();
  const baseDomain = getTenantBaseDomain(host);
  if (host === baseDomain || !host.endsWith(`.${baseDomain}`)) return null;
  const slug = host.slice(0, -(baseDomain.length + 1));
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)
    ? slug
    : null;
}

export function getDefaultSiteUrl(): string {
  const url = new URL("/", window.location.origin);
  url.hostname = getTenantBaseDomain(window.location.hostname.toLowerCase());
  return url.toString();
}

export function getLogoutRedirectUrl(): string {
  const url = new URL(getDefaultSiteUrl());
  url.pathname = "/login";
  url.searchParams.set("loggedOut", "1");
  return url.toString();
}

export function slugifyTenantName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
  return slug || "workspace";
}
