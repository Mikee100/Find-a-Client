"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminSystemUser, AdminUsersOverview, getAdminUsersOverview } from "@/lib/api";

type UsersScope = "all" | "developers" | "clients";

interface AdminUsersPanelProps {
  scope: UsersScope;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function UserTable({ users, type }: { users: AdminSystemUser[]; type: "developers" | "clients" }) {
  if (users.length === 0) {
    return <p className="text-sm text-slate-500">No {type} found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Name</th>
            <th className="px-2 py-2">Email</th>
            <th className="px-2 py-2">Username</th>
            <th className="px-2 py-2">Verified</th>
            <th className="px-2 py-2">Joined</th>
            <th className="px-2 py-2">Activity</th>
            <th className="px-2 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 text-slate-700">
              <td className="px-2 py-2">
                <p className="font-medium text-slate-900">{user.fullName}</p>
                {user.title ? <p className="text-xs text-slate-500">{user.title}</p> : null}
              </td>
              <td className="px-2 py-2">{user.email}</td>
              <td className="px-2 py-2">@{user.username}</td>
              <td className="px-2 py-2">{user.isVerified ? "Yes" : "No"}</td>
              <td className="px-2 py-2">{formatDate(user.createdAt)}</td>
              <td className="px-2 py-2">
                {type === "developers" ? `${user.projectsCount ?? 0} projects` : `${user.hireRequestsCount ?? 0} hire requests`}
              </td>
              <td className="px-2 py-2 text-right">
                <Link
                  href={`/admin/users/${encodeURIComponent(user.id)}`}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminUsersPanel({ scope }: AdminUsersPanelProps) {
  const [data, setData] = useState<AdminUsersOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getAdminUsersOverview()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load users.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const developers = data?.developers.length ?? 0;
    const clients = data?.clients.length ?? 0;
    return { developers, clients, total: developers + clients };
  }, [data]);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total users</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Developers</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.developers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Clients</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.clients}</p>
        </article>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Loading users...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!isLoading && !error ? (
        <>
          {scope !== "clients" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="mb-2 text-base font-semibold text-slate-900">Developers</h2>
              <UserTable users={data?.developers ?? []} type="developers" />
            </section>
          ) : null}

          {scope !== "developers" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="mb-2 text-base font-semibold text-slate-900">Clients</h2>
              <UserTable users={data?.clients ?? []} type="clients" />
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
