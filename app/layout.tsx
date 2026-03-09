import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MealMatrix Systems – Smart Meal Management Platform",
  description: "MealMatrix Systems is an intelligent, data-driven platform designed to optimize food preparation, reduce wastage, and automate meal operations using advance booking, QR-based verification, and predictive analytics.",
};

import { ClientToaster } from "@/components/ui/client-toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-background text-foreground font-sans min-h-screen flex flex-col`}
      >
        {children}
        <ClientToaster />
      </body>
    </html>
  );
}
