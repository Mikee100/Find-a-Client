"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppRole, register } from "@/lib/api";

function getRedirectPath(role: AppRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/projects/new?onboarding=1";
  }

  return "/developer/settings?onboarding=1";
}

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
    const role = String(formData.get("role") ?? "DEVELOPER").toUpperCase() as AppRole;
    const acceptTerms = formData.get("acceptTerms") === "on";

    if (!acceptTerms) {
      setPending(false);
      setError("You must accept terms to continue.");
      return;
    }

    try {
      const result = await register({ email, password, fullName, username, role });
      setSuccess("Account created. Redirecting to onboarding...");
      router.push(getRedirectPath(result.role));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Registration failed";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mb-3 text-neutral-600">MVP auth flow wired to backend register endpoint.</p>

        {error ? <p className="mb-2 text-red-700">{error}</p> : null}
        {success ? <p className="mb-2 text-green-700">{success}</p> : null}

        <form onSubmit={onSubmit} className="grid gap-2">
          <div className="grid gap-1">
            <label htmlFor="fullName" className="text-xs font-semibold text-neutral-600">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="username" className="text-xs font-semibold text-neutral-600">
              Username
            </label>
            <input
              id="username"
              name="username"
              required
              pattern="[a-z0-9-]+"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-neutral-600">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-600">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="role" className="text-xs font-semibold text-neutral-600">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="DEVELOPER"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            >
              <option value="DEVELOPER">Developer</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>

          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" name="acceptTerms" className="h-4 w-4" />
            <span>I accept the terms.</span>
          </label>

          <button
            className="mt-1 rounded-md border border-transparent bg-teal-700 px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-3 text-neutral-600">
          Already have an account? <Link href="/login" className="font-semibold text-teal-700">Sign in</Link>
        </p>
      </section>
    </main>
  );
}