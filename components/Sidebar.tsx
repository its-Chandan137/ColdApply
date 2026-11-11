"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface SidebarProps {
  pendingBadge?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  pendingBadge,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      label: "WORKSPACE",
      items: [
        {
          href: "/",
          label: "Overview",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ),
        },
        {
          href: "/outreach",
          label: "Outreach",
          badge: pendingBadge,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          ),
        },
        {
          href: "/jobs",
          label: "Jobs",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          ),
        },
        {
          href: "/contacts",
          label: "Contacts",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "IMPORTS",
      items: [
        {
          href: "/imports/alerts",
          label: "Alert Emails",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          ),
        },
        {
          href: "/imports/api",
          label: "Job APIs",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "ADMINISTRATION",
      items: [
        {
          href: "/profile",
          label: "Profile & Chunks",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ),
        },
        {
          href: "/settings",
          label: "Master Settings",
          badge: null,
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[280px] flex-col justify-between border-r border-[#E5EAF0] bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top brand header */}
        <div>
          <div className="flex h-[72px] items-center justify-between border-b border-[#F1F5F9] px-6">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              {/* Sleek emerald brand mark */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#062E29] to-[#087D6B] text-white shadow-xs">
                <svg
                  className="h-5 w-5 text-[#45DCC7]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M3 12c2.5-5 6.5-8 9-8s6.5 3 9 8c-2.5 5-6.5 8-9 8s-6.5-3-9-8z" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-[#111827]">
                    ColdAuto
                  </span>
                  <span className="rounded-full bg-[#E8F9F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#075B4E]">
                    OS
                  </span>
                </div>
                <p className="text-[11px] font-medium tracking-wide text-[#8293AD] uppercase">
                  Outreach Automation
                </p>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-6 px-4 py-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-2 text-[10px] font-bold tracking-wider text-[#8293AD] uppercase">
                  {group.label}
                </p>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? "bg-[#E8F9F5] text-[#075B4E] shadow-2xs font-semibold"
                            : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`transition-colors ${
                              active
                                ? "text-[#00BFA5]"
                                : "text-[#8293AD] group-hover:text-[#111827]"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        {item.badge}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Progress status card & Help */}
        <div className="space-y-3 p-4 border-t border-[#F1F5F9]">
          {/* Emerald Safety / Pacing card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#062E29] via-[#075B4E] to-[#087D6B] p-4 text-white shadow-md">
            {/* Decorative background circle */}
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full border border-white/10 opacity-30" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#45DCC7] backdrop-blur-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#45DCC7] animate-pulse" />
                  SAFETY GATE
                </span>
                <span className="text-[10px] font-semibold text-white/70">
                  Active
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">
                Human-in-the-loop
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-100/70">
                0 emails sent without review. 2–6 min pacing enabled.
              </p>
              <Link
                href="/settings"
                onClick={onClose}
                className="mt-3 flex items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20"
              >
                <span>Safety rules</span>
                <span className="text-xs">→</span>
              </Link>
            </div>
          </div>

          {/* Footer info: User avatar and version */}
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-[#8293AD]">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-2 hover:text-[#111827] transition"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                C
              </div>
              <span className="font-medium">Help &amp; docs</span>
            </Link>
            <span className="font-mono text-[10px] text-slate-400">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
