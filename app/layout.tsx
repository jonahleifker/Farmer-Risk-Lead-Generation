import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farmer Risk Copilot | Cost-Per-Acre & Hedge Breakeven Tool",
  description: "Free farmer risk modeling tool. Calculate cost-per-acre, hedge breakeven scenarios, and make confident marketing decisions.",
  keywords: ["farmer risk", "hedge breakeven", "cost per acre", "grain marketing", "commodity hedging"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
