
import type { Metadata } from "next";
import SiteChrome from "@/app/components/SiteChrome";
import "./globals.css";


export const metadata: Metadata = {
  title: "DaroBooks",
  description: "Accounting for businesses in any country.",
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#f0f7fb] font-sans text-[#08172e] antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
