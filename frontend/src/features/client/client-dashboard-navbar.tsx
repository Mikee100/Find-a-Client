import Link from "next/link";

export default function ClientDashboardNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Client
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/client/dashboard" className="rounded-md bg-neutral-100 px-2 py-1 font-semibold text-neutral-900">
            Overview
          </Link>
          <Link href="/developers" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Find Developers
          </Link>
        </div>
      </nav>
    </header>
  );
}
