import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dharohar — AR Museum Guide",
    template: "%s · Dharohar",
  },
  description:
    "Scan an exhibit, hear its history, inspect it in 3D, place it in your room with AR, and walk the gallery in 360°.",
  openGraph: {
    type: "website",
    siteName: "Dharohar",
    title: "Dharohar — AR Museum Guide",
    description:
      "Scan an exhibit, hear its history, inspect it in 3D, place it in your room with AR, and walk the gallery in 360°.",
    url: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
