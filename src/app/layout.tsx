import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { siteDescription, siteName, siteUrl } from "@/lib/site";

import "./globals.css";

// Display: Fraunces — a variable serif with real ink-trap character, close to
// museum catalogue typography. Used for headings and pull quotes only.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Text: Instrument Sans — neutral but slightly condensed, keeps long-form
// exhibit copy readable without looking like Inter.
const sans = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Data: IBM Plex Mono — codes, labels, accession numbers.
const mono = IBM_Plex_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dharohar — AR Museum Guide",
    template: "%s · Dharohar",
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    title: "Dharohar — AR Museum Guide",
    description: siteDescription,
    url: siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
