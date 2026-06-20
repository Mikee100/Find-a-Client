"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Code2, Eye, EyeOff, Globe, Lock, Mail } from "lucide-react";

import { AppRole, getGithubOAuthRedirect, getGoogleOAuthRedirect, login, resendVerification } from "@/lib/api";
import BrandLogo from "@/components/ui/brand-logo";

function getRedirectPath(role: AppRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/feed";
  }

  return "/developers/dashboard";
}

type RoleChoice = "DEVELOPER" | "CLIENT";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState<"google" | "github" | null>(null);
  const [pendingResend, setPendingResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(() => {
    if (typeof window === "undefined") {
      return "DEVELOPER";
    }
    const storedRole = window.localStorage.getItem("login.role");
    return storedRole === "CLIENT" || storedRole === "DEVELOPER"
      ? storedRole
      : "DEVELOPER";
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    window.localStorage.setItem("login.role", selectedRole);
  }, [selectedRole]);

  const oauthQueryError = useMemo(() => searchParams.get("oauthError")?.trim() ?? null, [searchParams]);
  const oauthQueryNotice = useMemo(() => searchParams.get("oauthNotice")?.trim() ?? null, [searchParams]);

  const visibleError = generalError ?? oauthQueryError;
  const visibleNotice = notice ?? (visibleError ? null : oauthQueryNotice);

  const primaryCta = useMemo(
    () =>
      selectedRole === "DEVELOPER"
        ? "Continue as Developer"
        : "Find Developers",
    [selectedRole],
  );

  const requiresVerification = useMemo(
    () => (generalError ?? "").toLowerCase().includes("verify your email"),
    [generalError]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setGeneralError(null);
    setNotice(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const nextErrors: FieldErrors = {};

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!email.includes("@")) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setPending(false);
      return;
    }

    try {
      setAttemptedEmail(email);
      const result = await login({ email, password });
      router.push(getRedirectPath(result.role));
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Login failed";
      setGeneralError(message);
    } finally {
      setPending(false);
    }
  }

  async function onResendVerification(): Promise<void> {
    if (!attemptedEmail) {
      setGeneralError("Enter your email and attempt login once, then resend verification.");
      return;
    }

    setPendingResend(true);
    setGeneralError(null);
    setNotice(null);

    try {
      await resendVerification({ email: attemptedEmail });
      setNotice("Verification email sent. Check your inbox and spam folder.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend verification email.";
      setGeneralError(message);
    } finally {
      setPendingResend(false);
    }
  }

  async function onOAuthLogin(provider: "google" | "github"): Promise<void> {
    setPendingOAuthProvider(provider);
    setGeneralError(null);
    setNotice(null);

    try {
      const next = getRedirectPath(selectedRole);
      const redirect = provider === "google"
        ? await getGoogleOAuthRedirect({ next, intent: "oauth-login" })
        : await getGithubOAuthRedirect({ next, intent: "oauth-login" });
      window.location.href = redirect.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start OAuth login.";
      setGeneralError(message);
      setPendingOAuthProvider(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] lg:grid-cols-2">
        <section className="relative hidden p-10 lg:block">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(79,70,229,0.08),transparent_48%),radial-gradient(circle_at_85%_80%,rgba(79,70,229,0.05),transparent_50%)]" />

          <div className="relative z-10">
            <div className="mb-12 inline-flex items-center">
              <BrandLogo />
            </div>

            <h1 className="max-w-md text-[32px] font-semibold leading-tight text-slate-900">
              Build. Showcase. Get Hired.
            </h1>

            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
              A professional marketplace where developers and clients connect through real work.
            </p>

            <ul className="mt-8 space-y-3 text-[15px] text-slate-700">
              <li>Verified developer profiles</li>
              <li>Direct client-to-developer communication</li>
              <li>Project-based hiring flow</li>
            </ul>
          </div>
        </section>

        <section className="grid min-h-[680px] place-items-center p-6 sm:p-10">
          <div className="w-full max-w-[420px]">
            <p className="text-sm font-medium text-slate-500">Access your workspace</p>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight text-slate-900">
              Continue building opportunities
            </h2>

            <div className="mt-6 grid grid-cols-2 rounded-xl border border-[#E5E7EB] bg-white p-1">
              <button
                type="button"
                onClick={() => setSelectedRole("DEVELOPER")}
                className={`rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                  selectedRole === "DEVELOPER"
                    ? "bg-[#4F46E5] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Developer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("CLIENT")}
                className={`rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                  selectedRole === "CLIENT"
                    ? "bg-[#4F46E5] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Client
              </button>
            </div>

            {visibleError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {visibleError}
              </p>
            ) : null}

            {visibleNotice ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {visibleNotice}
              </p>
            ) : null}

            {requiresVerification ? (
              <div className="mt-4 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">Your account exists but email verification is still pending.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onResendVerification();
                    }}
                    disabled={pendingResend}
                    className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingResend ? "Sending..." : "Resend verification"}
                  </button>
                  <Link
                    href={attemptedEmail ? `/verify-email?email=${encodeURIComponent(attemptedEmail)}` : "/verify-email"}
                    className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Go to verify page
                  </Link>
                </div>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  Email
                </label>
                <div className="flex h-12 items-center rounded-[10px] border border-[#E5E7EB] bg-white transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20">
                  <Mail className="ml-3 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent px-3 text-sm outline-none"
                    placeholder="name@company.com"
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="text-xs text-red-600">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  Password
                </label>
                <div className="flex h-12 items-center rounded-[10px] border border-[#E5E7EB] bg-white transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20">
                  <Lock className="ml-3 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    minLength={8}
                    required
                    className="w-full bg-transparent px-3 text-sm outline-none"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="mr-2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-xs text-red-600">{fieldErrors.password}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link
                  href="/forgot-password"
                  className="text-slate-500 transition hover:text-slate-700 hover:underline"
                >
                  Forgot password
                </Link>
                <Link
                  href="/register"
                  className="font-medium text-slate-700 transition hover:text-slate-900 hover:underline"
                >
                  Create account
                </Link>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#4F46E5] px-3 text-[15px] font-medium text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {pending ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  primaryCta
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span>OR</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  void onOAuthLogin("google");
                }}
                disabled={Boolean(pendingOAuthProvider)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Globe className="h-4 w-4" />
                {pendingOAuthProvider === "google" ? "Opening Google..." : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onOAuthLogin("github");
                }}
                disabled={Boolean(pendingOAuthProvider)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Code2 className="h-4 w-4" />
                {pendingOAuthProvider === "github" ? "Opening GitHub..." : "Continue with GitHub"}
              </button>
            </div>

            <p className="mt-6 text-sm text-slate-500">Enter your dashboard.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
