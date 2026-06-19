"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import AccountMenu from "@/features/shared/account-menu";
import BrandLogo from "@/components/ui/brand-logo";
import {
  getNotifications,
  getUnreadNotificationsCount,
  NotificationItem,
  logout,
  logoutEverywhere,
  readNotification,
  readAllNotifications
} from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/client/feed", label: "Discover", match: (pathname) => pathname === "/client/feed" || pathname === "/client/dashboard" },
  { href: "/client/likes", label: "Liked", match: (pathname) => pathname === "/client/likes" },
  { href: "/client/messages", label: "Messages", match: (pathname) => pathname.startsWith("/client/messages") },
  { href: "/client/hire-requests", label: "Hire Requests", match: (pathname) => pathname.startsWith("/client/hire-requests") }
];

function notificationHeading(item: NotificationItem): string {
  const payload = (item.payload ?? {}) as Record<string, unknown>;

  if (item.type === "NEW_MESSAGE") {
    const sender = typeof payload.senderName === "string" ? payload.senderName.trim() : "";
    return sender ? `New message from ${sender}` : "New message";
  }

  if (item.type === "DEAL_INTEREST") {
    const status = typeof payload.status === "string" ? payload.status.replace(/_/g, " ").toLowerCase() : "";
    return status ? `Hire request update: ${status}` : "Hire request update";
  }

  return item.type.replace(/_/g, " ").toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

function notificationBody(item: NotificationItem): string {
  const payload = (item.payload ?? {}) as Record<string, unknown>;

  if (item.type === "NEW_MESSAGE") {
    const preview = typeof payload.preview === "string" ? payload.preview.trim() : "";
    if (preview) {
      return preview;
    }

    const projectTitle = typeof payload.projectTitle === "string" ? payload.projectTitle.trim() : "";
    return projectTitle ? `Project: ${projectTitle}` : "Open messages to view the conversation.";
  }

  if (item.type === "DEAL_INTEREST") {
    const projectTitle = typeof payload.projectTitle === "string" ? payload.projectTitle.trim() : "";
    return projectTitle ? `Project: ${projectTitle}` : "Open hire requests for full details.";
  }

  return "Open notifications for full details.";
}

function notificationHref(item: NotificationItem): string {
  const payload = (item.payload ?? {}) as Record<string, unknown>;

  if (item.type === "NEW_MESSAGE") {
    const threadId = typeof payload.threadId === "string" ? payload.threadId.trim() : "";
    if (threadId) {
      return `/client/messages?thread=${encodeURIComponent(threadId)}`;
    }
    return "/client/messages";
  }

  if (item.type === "DEAL_INTEREST") {
    return "/client/hire-requests";
  }

  return "/client/feed";
}

export default function ClientDashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsMarking, setNotificationsMarking] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshUnreadCount = async () => {
    try {
      const result = await getUnreadNotificationsCount();
      setUnreadCount(result.unread);
    } catch {
      setUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);
      const items = await getNotifications(10);
      setNotifications(items);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Failed to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    const initialFetchId = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);

    const intervalId = window.setInterval(() => {
      void refreshUnreadCount();
    }, 30_000);

    return () => {
      window.clearTimeout(initialFetchId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!notificationsRef.current) {
        return;
      }

      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function onSignOut() {
    try {
      setPendingSignOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  async function onSignOutEverywhere() {
    try {
      setPendingSignOut(true);
      await logoutEverywhere();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        const result = await readNotification(item.id);
        if (result.updated > 0) {
          setNotifications((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)));
          setUnreadCount((current) => Math.max(0, current - 1));
        }
      } catch {
        // Continue navigation even if read sync fails.
      }
    }

    const target = notificationHref(item);
    setNotificationsOpen(false);
    router.push(target);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-100 md:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link href="/" aria-label="Find a Client" className="inline-flex items-center">
            <BrandLogo imageClassName="h-7 w-7 rounded-md" textClassName="text-[15px] font-semibold" />
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold transition ${
                  active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((current) => !current);
                if (!notificationsOpen) {
                  void loadNotifications();
                }
              }}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              aria-label="Notifications"
              title={unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
            >
              <Bell className="h-4 w-4" aria-hidden />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                <div className="mb-2 flex items-center justify-between px-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Notifications</p>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        try {
                          setNotificationsMarking(true);
                          await readAllNotifications();
                          setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
                          setUnreadCount(0);
                        } finally {
                          setNotificationsMarking(false);
                        }
                      })();
                    }}
                    disabled={notificationsMarking || unreadCount === 0}
                    className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    {notificationsMarking ? "Updating..." : "Mark all read"}
                  </button>
                </div>

                {notificationsLoading ? (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">Loading notifications...</p>
                ) : notificationsError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">No notifications yet.</p>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-auto pr-1">
                    {notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          void handleNotificationClick(item);
                        }}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          item.isRead ? "border-neutral-200 bg-white text-neutral-600" : "border-blue-200 bg-blue-50 text-blue-900"
                        } w-full text-left transition hover:border-neutral-300`}
                      >
                        <p className="font-semibold">{notificationHeading(item)}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] opacity-90">{notificationBody(item)}</p>
                        <p className="mt-1 text-[10px] opacity-70">{new Date(item.createdAt).toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <AccountMenu
            roleLabel="Client"
            pendingSignOut={pendingSignOut}
            onSignOut={onSignOut}
            onSignOutEverywhere={onSignOutEverywhere}
            dashboardHref="/client/feed"
            settingsHref="/client/settings"
            compact
          />
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          <div className="grid gap-2">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold transition ${
                    active ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
