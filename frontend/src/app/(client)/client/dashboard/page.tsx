import Link from "next/link";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";

export default function ClientDashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <ClientDashboardNavbar />
      <section className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl place-items-center p-4 md:p-6">
        <section className="w-full max-w-3xl rounded-xl border border-neutral-300 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <h1 className="text-2xl font-semibold">Client Dashboard</h1>
          <p className="mt-2 text-neutral-600">
            Client workspace scaffold is ready. Add discovery, hiring requests, and billing views here.
          </p>
          <p className="mt-3 text-neutral-600">
            Go to <Link href="/developer/dashboard" className="font-semibold text-teal-700">Developer Dashboard</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
