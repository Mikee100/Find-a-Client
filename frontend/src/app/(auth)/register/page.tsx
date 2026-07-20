"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { AppRole, getGithubOAuthRedirect, getGoogleOAuthRedirect, register } from "@/lib/api";
import BrandLogo from "@/components/ui/brand-logo";

type FieldErrors = {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  acceptTerms?: string;
};

function isValidUsername(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function passwordChecks(password: string): {
  minLength: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
} {
  return {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password)
  };
}

const fieldShellClass = "flex h-12 items-center rounded-xl border border-slate-300/90 bg-slate-50 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-600/15";
const fieldInputClass = "h-full w-full bg-transparent px-2 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none";
const fieldIconClass = "ml-2 h-4 w-4 text-slate-400";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState<"google" | "github" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [passwordDraft, setPasswordDraft] = useState("");

  const passwordState = useMemo(() => passwordChecks(passwordDraft), [passwordDraft]);

  async function onOAuthSignup(provider: "google" | "github"): Promise<void> {
    setPendingOAuthProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      const next = "/dashboard";
      const redirect = provider === "google"
        ? await getGoogleOAuthRedirect({ next, intent: "oauth-signup" })
        : await getGithubOAuthRedirect({ next, intent: "oauth-signup" });
      window.location.href = redirect.url;
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : "Unable to start OAuth signup.";
      setError(message);
      setPendingOAuthProvider(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const role = String(formData.get("role") ?? "DEVELOPER").toUpperCase() as AppRole;
    const acceptTerms = formData.get("acceptTerms") === "on";

    const nextErrors: FieldErrors = {};

    if (!fullName) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!username) {
      nextErrors.username = "Username is required.";
    } else if (!isValidUsername(username)) {
      nextErrors.username = "Use lowercase letters, numbers, and single hyphens between words.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!email.includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }

    const checks = passwordChecks(password);
    if (!checks.minLength || !checks.upper || !checks.lower || !checks.number) {
      nextErrors.password = "Password must be at least 8 characters and include upper/lowercase letters and a number.";
    }

    if (role !== "DEVELOPER" && role !== "CLIENT") {
      nextErrors.role = "Choose a valid account type.";
    }

    if (!acceptTerms) {
      nextErrors.acceptTerms = "You must accept terms and privacy policy to continue.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setPending(false);
      return;
    }

    try {
      await register({ email, password, fullName, username, role });
      setSuccess("Account created. Check your email for a verification link.");
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Registration failed";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#eef6f4_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#12314a_50%,#0b3440_100%)] p-10 text-white lg:block">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-6 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-10 inline-flex rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
              <BrandLogo />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Account setup
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">
              Create your workspace account.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-200/90">
              Secure email registration with Google and GitHub sign-up options.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-sm font-medium">Verified sign-up</p>
                  <p className="text-xs text-slate-200/80">Email verification and secure provider sign-in.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <Building2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                <div>
                  <p className="text-sm font-medium">Role selection</p>
                  <p className="text-xs text-slate-200/80">Choose Developer or Client during registration.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-amber-300" />
                <div>
                  <p className="text-sm font-medium">Strong validation</p>
                  <p className="text-xs text-slate-200/80">Practical checks for username, password, and consent.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-h-screen place-items-center p-5 sm:p-8 lg:min-h-0 lg:p-10">
          <div className="w-full max-w-xl">
            <div className="mb-6 lg:hidden">
              <BrandLogo />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create your account</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">Continue building opportunities</h2>
            <p className="mt-2 text-sm text-slate-600">Use your email or continue with a trusted provider.</p>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}

            {success ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  void onOAuthSignup("google");
                }}
                disabled={pendingOAuthProvider !== null}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.5 14.8 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6z" />
                </svg>
                {pendingOAuthProvider === "google" ? "Connecting..." : "Sign up with Google"}
              </button>

              <button
                type="button"
                onClick={() => {
                  void onOAuthSignup("github");
                }}
                disabled={pendingOAuthProvider !== null}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.2.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 1.7 1.5 1.7 1.5.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"
                  />
                </svg>
                {pendingOAuthProvider === "github" ? "Connecting..." : "Sign up with GitHub"}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Full name</label>
                <div className={fieldShellClass}>
                  <UserRound className={fieldIconClass} />
                  <input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    required
                    className={fieldInputClass}
                    placeholder="Jane Doe"
                  />
                </div>
                {fieldErrors.fullName ? <p className="text-xs text-rose-600">{fieldErrors.fullName}</p> : null}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Username</label>
                <div className={fieldShellClass}>
                  <span className="ml-2 text-sm text-slate-400">@</span>
                  <input
                    id="username"
                    name="username"
                    required
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Use lowercase letters, numbers, and single hyphens between words."
                    className={fieldInputClass}
                    placeholder="jane-dev"
                  />
                </div>
                {fieldErrors.username ? <p className="text-xs text-rose-600">{fieldErrors.username}</p> : null}
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email</label>
                  <div className={fieldShellClass}>
                    <Mail className={fieldIconClass} />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={fieldInputClass}
                      placeholder="name@company.com"
                    />
                  </div>
                  {fieldErrors.email ? <p className="text-xs text-rose-600">{fieldErrors.email}</p> : null}
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="role" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Account type</label>
                  <div className={fieldShellClass}>
                    <Building2 className={fieldIconClass} />
                    <select
                      id="role"
                      name="role"
                      defaultValue="DEVELOPER"
                      className={fieldInputClass}
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="CLIENT">Client</option>
                    </select>
                  </div>
                  {fieldErrors.role ? <p className="text-xs text-rose-600">{fieldErrors.role}</p> : null}
                </div>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Password</label>
                <div className={fieldShellClass}>
                  <KeyRound className={fieldIconClass} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
                    required
                    className={fieldInputClass}
                    placeholder="Choose a strong password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="mr-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs">
                  <p className={passwordState.minLength ? "text-emerald-600" : "text-slate-500"}>At least 8 chars</p>
                  <p className={passwordState.upper ? "text-emerald-600" : "text-slate-500"}>Uppercase letter</p>
                  <p className={passwordState.lower ? "text-emerald-600" : "text-slate-500"}>Lowercase letter</p>
                  <p className={passwordState.number ? "text-emerald-600" : "text-slate-500"}>One number</p>
                </div>
                {fieldErrors.password ? <p className="text-xs text-rose-600">{fieldErrors.password}</p> : null}
              </div>

              <label className="mt-1 flex items-start gap-2 text-sm text-slate-600">
                <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600" />
                <span>
                  I agree to the terms of service and privacy policy.
                </span>
              </label>
              {fieldErrors.acceptTerms ? <p className="-mt-2 text-xs text-rose-600">{fieldErrors.acceptTerms}</p> : null}

              <button
                className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#0f766e_0%,#0f4c81_100%)] px-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-80"
                type="submit"
                disabled={pending}
              >
                {pending ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    Create secure account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#0f4c81] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}