"use client";

import { Suspense, useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

interface AppShellProps {
  children: React.ReactNode;
  pendingBadge?: React.ReactNode;
}

export default function AppShell({
  children,
  pendingBadge,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#111827]">
      {/* Sidebar: Fixed on desktop, Drawer on mobile */}
      <Suspense
        fallback={
          <aside className="fixed top-0 bottom-0 left-0 z-50 hidden w-[280px] border-r border-[#E5EAF0] bg-white lg:block" />
        }
      >
        <Sidebar
          pendingBadge={pendingBadge}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </Suspense>

      {/* Main Content Area: Offset by sidebar width on desktop */}
      <div className="flex min-h-screen flex-col lg:pl-[280px]">
        <Suspense
          fallback={
            <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-[#E5EAF0] bg-white px-6" />
          }
        >
          <TopNav onToggleSidebar={() => setSidebarOpen(true)} />
        </Suspense>
        <main className="flex-1 p-5 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
