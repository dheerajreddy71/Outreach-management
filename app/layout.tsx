import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unified Inbox - Multi-Channel Customer Outreach",
  description: "Centralized platform for team-based customer engagement across SMS, WhatsApp, Email, and Social Media",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
              {children}
            </main>
          </div>
          <KeyboardShortcutsHelp />
        </Providers>
      </body>
    </html>
  );
}
