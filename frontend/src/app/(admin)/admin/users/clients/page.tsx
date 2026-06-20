"use client";

import AdminShell from "@/features/admins/admin-shell";
import AdminUsersPanel from "@/features/admins/admin-users-panel";

export default function AdminClientsPage() {
  return (
    <AdminShell title="Users: Clients" subtitle="Client accounts in the system.">
      <AdminUsersPanel scope="clients" />
    </AdminShell>
  );
}
