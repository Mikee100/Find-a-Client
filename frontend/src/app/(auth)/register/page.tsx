"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const acceptTerms = formData.get("acceptTerms") === "on";

    if (!acceptTerms) {
      setPending(false);
      setError("You must accept terms to continue.");
      return;
    }

    try {
      await register({ email, password, fullName, username });
      setSuccess("Account created. Redirecting to dashboard...");
      router.push("/developer/dashboard");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Registration failed";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <h1 className="mt-5 text-2xl font-semibold text-neutral-950">Create your account</h1>
          <p className="mt-1 text-sm text-neutral-600">
            The current backend registration contract creates the account with email, password, full name, and username.
          </p>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                pattern="[a-z0-9-]+"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <label className="mt-1 flex items-start gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
              <span>I accept the terms and understand my workspace access depends on the backend role assigned to my account.</span>
            </label>

            <button
              className="mt-1 rounded-md border border-transparent bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={pending}
            >
              {pending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-neutral-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-teal-700">
              Sign in
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Marketplace-ready profile</p>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            Build a presence clients can evaluate quickly.
          </h2>
          <p className="max-w-xl text-sm leading-6 text-neutral-600">
            After registration, complete your profile, publish projects, and use your dashboard to manage conversations and saved opportunities.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Profile setup", "Project publishing", "Client conversations", "Saved opportunities"].map((item) => (
              <div key={item} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-900">{item}</p>
                <p className="mt-1 text-xs text-neutral-600">Available after sign in.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
