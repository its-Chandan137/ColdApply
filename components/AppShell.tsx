"use client";

import { useState } from "react";
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
      <Sidebar
        pendingBadge={pendingBadge}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area: Offset by sidebar width on desktop */}
      <div className="flex min-h-screen flex-col lg:pl-[280px]">
        <TopNav
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-5 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
