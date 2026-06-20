"use client";

import AdminShell from "@/features/admins/admin-shell";
import AdminUsersPanel from "@/features/admins/admin-users-panel";

export default function AdminDevelopersPage() {
  return (
    <AdminShell title="Users: Developers" subtitle="Developer accounts in the system.">
      <AdminUsersPanel scope="developers" />
    </AdminShell>
  );
}
