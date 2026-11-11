import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ColdAuto — Cold Email Job Outreach",
  description: "Enterprise-grade local cold email job outreach automation",
};

async function PendingBadge() {
  try {
    const count = await prisma.outreach.count({
      where: { status: "drafted" },
    });
    if (count <= 0) return null;
    return (
      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 border border-rose-200">
        {count}
      </span>
    );
  } catch {
    return null;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F4F7FA] font-sans text-[#111827] antialiased">
        <AppShell
          pendingBadge={
            <Suspense fallback={null}>
              <PendingBadge />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
