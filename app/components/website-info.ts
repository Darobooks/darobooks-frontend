export type WebsiteInfoResponse = {
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

export type PublicWebsiteInfo = Omit<WebsiteInfoResponse, "logoUploaded"> & {
  logoUrl: string | null;
};

export const defaultWebsiteInfo: PublicWebsiteInfo = {
  siteName: "DaroBooks",
  tagline: "Accounting for businesses in any country.",
  supportEmail: "support@darobooks.com",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  websiteUrl: "",
  facebookUrl: "",
  linkedinUrl: "",
  xUrl: "",
  logoUrl: null,
};

export function isWebsiteInfoResponse(
  value: unknown,
): value is WebsiteInfoResponse {
  if (!value || typeof value !== "object") return false;
  const info = value as Partial<WebsiteInfoResponse>;
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
