"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AdminShell from "@/features/admins/admin-shell";
import {
  AdminUserDetail,
  getAdminUserDetail,
  setAdminUserAccess,
  setAdminUserPassword,
  setAdminUserRole,
  setAdminUserVerification
} from "@/lib/api";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export default function AdminUserManagePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getAdminUserDetail(userId)
      .then((result) => {
        if (!cancelled) {
          setUser(result);
          setError(null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load user.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function runAction(action: () => Promise<AdminUserDetail>, successLabel: string) {
    setWorking(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await action();
      setUser(updated);
      setMessage(successLabel);
      setNewPassword("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setWorking(false);
    }
  }

  function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newPassword.trim()) {
      setError("Enter a new password first.");
      return;
    }

    void runAction(
      () => setAdminUserPassword(userId, newPassword.trim()),
      "Password updated and active sessions revoked."
    );
  }

  return (
    <AdminShell title="Manage User" subtitle="Inspect account details and perform admin actions.">
      <section className="grid gap-4">
        <Link href="/admin/users" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Back to users
        </Link>

        {loading ? <p className="text-sm text-slate-500">Loading user profile...</p> : null}
        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        {user ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{user.fullName}</h2>
              <p className="text-sm text-slate-600">{user.email} · @{user.username}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p>Role: <strong>{user.role}</strong></p>
                <p>Verified: <strong>{user.isVerified ? "Yes" : "No"}</strong></p>
                <p>Disabled: <strong>{user.accountState.disabled ? "Yes" : "No"}</strong></p>
                <p>Last sign in: <strong>{formatDate(user.accountState.lastSignInAt)}</strong></p>
                <p>Joined: <strong>{formatDate(user.createdAt)}</strong></p>
                <p>Updated: <strong>{formatDate(user.updatedAt)}</strong></p>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p>Projects: <strong>{user.counts.projects}</strong></p>
                <p>Hire requests sent: <strong>{user.counts.sentHireRequests}</strong></p>
                <p>Hire requests received: <strong>{user.counts.receivedHireRequests}</strong></p>
                <p>Messages sent: <strong>{user.counts.sentMessages}</strong></p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Account Access</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={working || user.accountState.disabled}
                  onClick={() => {
                    void runAction(() => setAdminUserAccess(userId, true), "Account disabled.");
                  }}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Disable account
                </button>
                <button
                  type="button"
                  disabled={working || !user.accountState.disabled}
                  onClick={() => {
                    void runAction(() => setAdminUserAccess(userId, false), "Account enabled.");
                  }}
                  className="rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Enable account
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Role & Verification</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={working || user.role === "DEVELOPER"}
                  onClick={() => {
                    void runAction(() => setAdminUserRole(userId, "DEVELOPER"), "Role updated to DEVELOPER.");
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Set Developer
                </button>
                <button
                  type="button"
                  disabled={working || user.role === "CLIENT"}
                  onClick={() => {
                    void runAction(() => setAdminUserRole(userId, "CLIENT"), "Role updated to CLIENT.");
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Set Client
                </button>
                <button
                  type="button"
                  disabled={working || user.isVerified}
                  onClick={() => {
                    void runAction(() => setAdminUserVerification(userId, true), "User marked as verified.");
                  }}
                  className="rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Mark Verified
                </button>
                <button
                  type="button"
                  disabled={working || !user.isVerified}
                  onClick={() => {
                    void runAction(() => setAdminUserVerification(userId, false), "User marked as not verified.");
                  }}
                  className="rounded-md border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                >
                  Mark Unverified
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Password Management</h3>
              <form onSubmit={onPasswordSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="text"
                  placeholder="Enter new temporary password"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-600"
                />
                <button
                  type="submit"
                  disabled={working}
                  className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Set Password
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">
                Password update revokes existing refresh sessions and forces the user to sign in again.
              </p>
            </section>
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
