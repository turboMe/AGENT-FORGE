import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarLayout } from "@/components/sidebar-layout";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AgentForge",
  description: "Self-Evolving Agent Ecosystem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
