"use client";

import AdminShell from "@/features/admins/admin-shell";
import AdminUsersPanel from "@/features/admins/admin-users-panel";

export default function AdminUsersPage() {
  return (
    <AdminShell title="Users" subtitle="Manage system users, split between developers and clients.">
      <AdminUsersPanel scope="all" />
    </AdminShell>
  );
}
