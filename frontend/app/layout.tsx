import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Navbar } from "@/components/Navbar";
import { NetworkBanner } from "@/components/NetworkBanner";
import { HelpButton } from "@/components/HelpButton";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CredStream | Decentralized Invoice Factoring",
  description: "Unlock liquidity from your invoices with AI-powered risk scoring on Mantle Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThirdwebProvider>
          <NetworkBanner />
          <Navbar />
          <main className="pt-16">{children}</main>
          <HelpButton />
          <Toaster richColors position="top-right" />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
