import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: {
    default: "R&D Financial OS",
    template: "%s | R&D Financial OS",
  },
  description:
    "The financial operating system for R&D-intensive and AI companies",
  openGraph: {
    title: "R&D Financial OS",
    description:
      "The financial operating system for R&D-intensive and AI companies",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
