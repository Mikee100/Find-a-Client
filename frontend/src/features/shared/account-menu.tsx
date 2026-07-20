"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AuthSession, getAuthSession } from "@/lib/api";

interface AccountMenuProps {
  roleLabel: string;
  pendingSignOut: boolean;
  onSignOut: () => void;
  onSignOutEverywhere?: () => void;
  dashboardHref: string;
  settingsHref?: string;
  compact?: boolean;
}

export default function AccountMenu({
  roleLabel,
  pendingSignOut,
  onSignOut,
  onSignOutEverywhere,
  dashboardHref,
  settingsHref = "/account/settings",
  compact = false
}: AccountMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showSignOutNotice, setShowSignOutNotice] = useState(false);

  useEffect(() => {
    void getAuthSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (pendingSignOut || !showSignOutNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSignOutNotice(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingSignOut, showSignOutNotice]);

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
  let shortLabel = roleLabel;
  if (session?.email) {
    const [left] = session.email.split("@");
    initials = left.slice(0, 2).toUpperCase();
    shortLabel = left.slice(0, 8);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={pendingSignOut}
        className={
          compact
            ? "flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            : "flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-1.5 pr-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={pendingSignOut || showSignOutNotice}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
          {initials}
        </span>
        {!compact ? <span className="hidden max-w-16 truncate text-[11px] text-neutral-600 lg:inline">{shortLabel}</span> : null}
        {!compact ? <ChevronDown className="h-3 w-3 text-neutral-500" aria-hidden /> : null}
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
              My workspace
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
                setShowSignOutNotice(true);
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
                  setShowSignOutNotice(true);
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

      {showSignOutNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-[0_20px_55px_rgba(15,23,42,0.15)]">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800"
              aria-hidden
            />
            <div className="text-sm font-semibold text-neutral-800">Signing you out...</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
