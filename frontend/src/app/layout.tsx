import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "../components/shared/Navigation";
import { NotificationCenter } from "../components/notifications/NotificationCenter";
import { ClientOnly } from "../components/shared/ClientOnly";
import { ToastProvider } from "../components/shared/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent 7715 | Automated DeFi Trading Terminal",
  description: "Institutional-grade automated trading agent powered by ERC-7715 Advanced Permissions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-zinc-950 text-foreground antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ToastProvider>
            <ClientOnly>
              <Navigation />
              <NotificationCenter />
            </ClientOnly>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
