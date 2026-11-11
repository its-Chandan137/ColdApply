"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopNavProps {
  onToggleSidebar?: () => void;
  pendingCount?: number;
}

export default function TopNav({
  onToggleSidebar,
  pendingCount = 0,
}: TopNavProps) {
  const pathname = usePathname();

  // Dynamic breadcrumb
  const getBreadcrumb = () => {
    if (pathname === "/") return "Overview";
    if (pathname.startsWith("/outreach")) return "Outreach Queue";
    if (pathname.startsWith("/jobs")) return "Jobs Pipeline";
    if (pathname.startsWith("/contacts")) return "Contacts";
    if (pathname.startsWith("/profile")) return "Profile & Resume";
    if (pathname.startsWith("/settings")) return "Master Settings";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#E5EAF0] bg-white px-6">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-sm">
          <span className="font-medium text-[#8293AD]">Workspace</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-[#111827]">
            {getBreadcrumb()}
          </span>
        </nav>
      </div>

      {/* Right: Search + Engine Status + Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8293AD]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search anything…"
            className="h-10 w-56 rounded-xl border border-[#E5EAF0] bg-[#F4F7FA] pl-9 pr-10 text-xs text-[#111827] placeholder-[#8293AD] transition focus:border-[#00BFA5] focus:bg-white focus:outline-hidden lg:w-64"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="rounded border border-[#E5EAF0] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#8293AD] shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Engine / Account pill */}
        <Link
          href="/settings"
          className="hidden sm:flex items-center gap-2 rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#111827] transition hover:bg-slate-50"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-800">Gmail Engine</span>
          <svg
            className="h-3.5 w-3.5 text-[#8293AD]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </Link>

        {/* Notifications Icon with Unread Badge */}
        <Link
          href="/outreach"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF0] bg-white text-[#8293AD] transition hover:bg-slate-50 hover:text-[#111827]"
          title={`${pendingCount} drafts pending review`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
          )}
        </Link>

        {/* User profile dropdown button */}
        <div className="flex items-center gap-2.5 rounded-xl border border-transparent p-1 transition hover:bg-slate-50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#062E29] to-[#075B4E] text-xs font-bold text-white shadow-2xs">
            VM
          </div>
          <div className="hidden text-left xl:block">
            <p className="text-xs font-bold leading-tight text-[#111827]">
              Vedhas M.
            </p>
            <p className="text-[10px] font-medium text-[#8293AD]">
              Lead Admin
            </p>
          </div>
          <svg
            className="hidden h-3.5 w-3.5 text-[#8293AD] xl:block"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </header>
  );
}

