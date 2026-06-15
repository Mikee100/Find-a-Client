import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-5">
      <section className="w-full max-w-2xl rounded-xl border border-neutral-300 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1>Find a Client</h1>
        <p className="mt-2 text-neutral-600">
          Frontend starter is ready with role folders for developer, client, and admin.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/register"
            className="rounded-md border border-transparent bg-teal-700 px-3 py-2 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Sign in
          </Link>
          <Link
            href="/developer/dashboard"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Developer area
          </Link>
          <Link
            href="/client/dashboard"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Client area
          </Link>
          <Link
            href="/admin/dashboard"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Admin area
          </Link>
        </div>
      </section>
    </main>
  );
}
