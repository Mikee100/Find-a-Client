"use client";

import Link from "next/link";

interface DashboardNavbarProps {
  roleLabel: string;
  onSignOut: () => void;
  pendingSignOut: boolean;
}

export default function DashboardNavbar({
  roleLabel,
  onSignOut,
  pendingSignOut
}: DashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
            {roleLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/developer/dashboard" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Developer
          </Link>
          <Link href="/client/dashboard" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Client
          </Link>
          <Link href="/admin/dashboard" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Admin
          </Link>
          <button
            onClick={onSignOut}
            disabled={pendingSignOut}
            className="rounded-md bg-teal-700 px-3 py-1.5 font-semibold text-white disabled:opacity-70"
          >
            {pendingSignOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </nav>
    </header>
  );
}
