"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthSession, getAuthSession } from "@/lib/api";

interface AccountMenuProps {
  roleLabel: string;
  pendingSignOut: boolean;
  onSignOut: () => void;
  onSignOutEverywhere?: () => void;
  dashboardHref: string;
  settingsHref?: string;
}

export default function AccountMenu({
  roleLabel,
  pendingSignOut,
  onSignOut,
  onSignOutEverywhere,
  dashboardHref,
  settingsHref = "/account/settings"
}: AccountMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void getAuthSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  let initials = roleLabel.slice(0, 1).toUpperCase();
  if (session?.email) {
    const [left] = session.email.split("@");
    initials = left.slice(0, 2).toUpperCase();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden md:inline">Account</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          <div className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Signed in as</p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">{session?.email ?? "Authenticated user"}</p>
            <p className="text-xs text-neutral-600">Role: {roleLabel}</p>
          </div>

          <div className="mt-2 grid gap-1 text-sm">
            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
            >
              My dashboard
            </Link>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Account settings
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              disabled={pendingSignOut}
              className="rounded-md px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {pendingSignOut ? "Signing out..." : "Sign out"}
            </button>
            {onSignOutEverywhere ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOutEverywhere();
                }}
                disabled={pendingSignOut}
                className="rounded-md px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {pendingSignOut ? "Signing out..." : "Sign out everywhere"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
