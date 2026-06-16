import Link from "next/link";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <MarketplaceNavbar />
      <section className="grid place-items-center p-4 md:p-6">
        <section className="w-full max-w-3xl rounded-xl border border-neutral-300 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2 text-neutral-600">
            Admin workspace scaffold is ready. Add moderation, approvals, and platform controls here.
          </p>
          <p className="mt-3 text-neutral-600">
            Go to <Link href="/developer/dashboard" className="font-semibold text-teal-700">Developer Dashboard</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
