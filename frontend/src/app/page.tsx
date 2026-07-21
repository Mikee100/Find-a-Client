"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Eye,
  Menu,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  Wallet,
  Workflow,
} from "lucide-react";
import BrandLogo from "@/components/ui/brand-logo";
import { DeveloperSearchItem, listProjects, ProjectListItem, searchDevelopers } from "@/lib/api";

type FAQ = { question: string; answer: string };

const escrowSteps = [
  { icon: Wallet, title: "Fund a milestone", text: "Client commits payment for one phase of the project through escrow." },
  { icon: Send, title: "Developer delivers", text: "Work is submitted for that phase, with a delivery note and links." },
  { icon: Eye, title: "Client reviews", text: "Nothing releases automatically — the client checks the work first." },
  { icon: Unlock, title: "Funds release", text: "Payment only reaches the developer once the phase is verified." },
];

const faqs: FAQ[] = [
  {
    question: "How are developers verified?",
    answer:
      "Profiles are validated by parsing portfolio code quality, past project delivery, and platform activity signals. We review actual project deliveries, not just algorithm quizzes.",
  },
  {
    question: "What happens if a developer doesn't deliver?",
    answer:
      "Funds sit in escrow, not with the developer, until you approve the work. If something goes wrong, either side can raise a dispute, which freezes the milestone until an admin resolves it — release or refund.",
  },
  {
    question: "Can clients hire globally?",
    answer:
      "Yes. Clients can discover, message, and hire developers across regions, with proposals in the currency and timeline that work for the project.",
  },
  {
    question: "What makes AI matching different?",
    answer:
      "Our matching model ranks candidates by project structural fit, stack depth, and actual delivery context, mapping your brief directly to developer portfolios instead of simple keyword checks.",
  },
  {
    question: "Is there a free plan for developers?",
    answer:
      "Yes. Developers can build a full profile and list unlimited projects for free. The platform only takes a 10% fee on milestones that are actually funded and released — there's no subscription.",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const [developers, setDevelopers] = useState<DeveloperSearchItem[]>([]);
  const [developersLoading, setDevelopersLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await searchDevelopers({ limit: 4 });
        if (!cancelled) setDevelopers(items);
      } catch {
        // Public homepage — fail quietly, section just shows its empty state.
      } finally {
        if (!cancelled) setDevelopersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await listProjects({ limit: 3, sortBy: "popular" });
        if (!cancelled) setProjects(items);
      } catch {
        // Public homepage — fail quietly, section just shows its empty state.
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? "border-b border-slate-200 bg-white/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-semibold tracking-wider text-slate-500 uppercase lg:flex">
            <Link href="/" className="transition hover:text-slate-900">Home</Link>
            <Link href="/developers/profile" className="transition hover:text-slate-900">Developers</Link>
            <Link href="/client/feed" className="transition hover:text-slate-900">Find Talent</Link>
            <Link href="/projects" className="transition hover:text-slate-900">Projects</Link>
            <Link href="#pricing" className="transition hover:text-slate-900">Pricing</Link>
            <Link href="#faq" className="transition hover:text-slate-900">FAQ</Link>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <Link href="/login" className="text-xs font-semibold tracking-wider uppercase text-slate-600 hover:text-slate-900">
              Login
            </Link>
            <Link
              href="/register"
              className="border border-slate-900 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase transition hover:bg-slate-900 hover:text-white"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:border-slate-900 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border-b border-slate-200 bg-white p-4 lg:hidden"
            >
              <div className="grid gap-3 text-sm font-medium">
                <Link href="/projects" onClick={() => setMobileOpen(false)} className="text-slate-600 hover:text-slate-900">
                  Projects
                </Link>
                <Link href="/developers/profile" onClick={() => setMobileOpen(false)} className="text-slate-600 hover:text-slate-900">
                  Developers
                </Link>
                <Link href="/client/feed" onClick={() => setMobileOpen(false)} className="text-slate-600 hover:text-slate-900">
                  Find Talent
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="text-slate-600 hover:text-slate-900">
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="bg-slate-900 py-3.5 text-center text-xs font-semibold tracking-wider uppercase text-white hover:bg-black"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-[#f8fafc] px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto w-full max-w-7xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-500 shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-slate-800" />
              Built for founders hiring their first developer
            </motion.p>

            <h1 className="mt-6 max-w-4xl text-5xl font-light tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Hire a developer for your MVP. Pay only for verified work.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-500">
              Fund each phase of your build through escrow. Nothing is released until you review the work — so you never
              have to wonder if a developer will disappear with your money, or your project stalls with no recourse.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-slate-900 px-6 py-3.5 text-xs font-semibold tracking-wider uppercase text-white hover:bg-black transition"
              >
                Hire Developers
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/developers/profile"
                className="border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold tracking-wider uppercase text-slate-700 hover:border-slate-950 transition"
              >
                Explore Portfolios
              </Link>
            </div>
          </div>
        </section>

        {/* Escrow Explainer Section */}
        <section className="border-b border-slate-200 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">How it works</p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Escrow protects both sides</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {escrowSteps.map((step, index) => (
                <div key={step.title} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 font-mono text-[10px] text-white">
                      {index + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-slate-900" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="about" className="border-b border-slate-200 bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Why choose us</p>
                <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Built for high-end delivery</h2>
              </div>
              <div className="grid gap-8 sm:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Verified Portfolios",
                    text: "Every developer showcases verified project records, tech stacks, and live application URLs.",
                  },
                  {
                    icon: Brain,
                    title: "AI Project Matching",
                    text: "Interpretation models match your technical requirements directly to candidate experience.",
                  },
                  {
                    icon: Workflow,
                    title: "Direct Pipeline",
                    text: "Message directly, send structured proposals, and collaborate using standard status workflows.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="space-y-3">
                    <feature.icon className="h-5 w-5 text-slate-900" />
                    <h3 className="text-sm font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-500">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Developer Directory Section */}
        <section id="resources" className="border-b border-slate-200 bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Directory</p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Featured Developers</h2>

            <div className="mt-8 border border-slate-200 bg-white">
              {developersLoading ? (
                <p className="p-5 text-xs text-slate-500">Loading developers...</p>
              ) : developers.length === 0 ? (
                <p className="p-5 text-xs text-slate-500">No developers to show yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {developers.map((dev) => (
                    <article key={dev.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition hover:bg-slate-50">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{dev.fullName}</h3>
                          {dev.location ? <span className="text-[11px] text-slate-400">({dev.location})</span> : null}
                        </div>
                        {dev.title ? <p className="text-xs text-slate-500">{dev.title}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {dev.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="bg-slate-100 px-2 py-0.5 font-mono text-[9px] text-slate-500">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-slate-500">{dev.projectCount} projects</span>
                        <Link
                          href={`/developers/${dev.username}`}
                          className="border border-slate-200 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-950 transition"
                        >
                          View Profile
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured Projects Section */}
        <section className="border-b border-slate-200 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Portfolios</p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Recent Project Deliveries</h2>

            {projectsLoading ? (
              <p className="mt-8 text-xs text-slate-500">Loading projects...</p>
            ) : projects.length === 0 ? (
              <p className="mt-8 text-xs text-slate-500">No projects to show yet.</p>
            ) : (
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="flex flex-col justify-between border border-slate-200 p-5 bg-white transition hover:border-slate-900"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">{project.title}</h3>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {project.viewCount} views
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500">{project.shortDescription}</p>
                      <div className="mt-4 flex flex-wrap gap-1">
                        {project.techStack.slice(0, 4).map((t) => (
                          <span key={t} className="bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <p className="text-[11px] text-slate-400">{project.likeCount} likes</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* AI Showcase */}
        <section className="border-b border-slate-200 bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">AI Engine</p>
                <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Describe your project. Receive ranked matches.</h2>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Instead of scrolling through generic directories, describe your project scope. Our matching model parses implementation portfolios and context to identify the best candidates immediately.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-600">
                  {[
                    "Interpret intent using stack and domain context",
                    "Score candidates based on delivery history and profile completeness",
                    "Generate custom shortlists and interface options",
                  ].map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-slate-900 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-slate-200 bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Simulated Brief Input</p>
                <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-500">
                  &ldquo;Need a developer to build my startup&rsquo;s MVP with Next.js and a Postgres backend, launching in 8 weeks.&rdquo;
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="font-semibold">Dennis Kimani (Full Stack)</span>
                    <span className="font-mono text-emerald-700 font-semibold">96% Fit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="font-semibold">Samir Hassan (Backend/API)</span>
                    <span className="font-mono text-emerald-700 font-semibold">89% Fit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-b border-slate-200 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pricing</p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900">Free to join. Pay only when work is verified.</h2>

            <div className="mt-8 max-w-2xl border border-slate-200 p-6 bg-white">
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0" />
                  Free for developers and clients to create a profile, list projects, and message
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0" />
                  10% platform fee, taken only from milestones that are funded and released
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0" />
                  No subscriptions, no listing fees, nothing charged upfront
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section id="faq" className="px-4 py-16 sm:px-6 lg:px-8 bg-[#f8fafc] border-b border-slate-200">
          <div className="mx-auto w-full max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">FAQ</p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-slate-900 text-center">Frequently Answered Questions</h2>

            <div className="mt-8 border border-slate-200 bg-white">
              {faqs.map((faq, idx) => (
                <article key={faq.question} className="border-b border-slate-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setActiveFaq((prev) => (prev === idx ? null : idx))}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <span className="text-xs font-semibold text-slate-900">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${activeFaq === idx ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activeFaq === idx ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="p-4 pt-0 text-xs leading-relaxed text-slate-500">{faq.answer}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 text-center sm:px-6 lg:px-8 bg-slate-950 text-white">
          <div className="mx-auto w-full max-w-4xl">
            <h2 className="text-3xl font-light tracking-tight">Ready to hire or showcase?</h2>
            <p className="mt-2 text-xs text-slate-400">Join a verified network of serious developers and clients shipping real systems.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="bg-white px-6 py-3 text-xs font-semibold tracking-wider uppercase text-slate-950 hover:bg-slate-100 transition"
              >
                Get Started
              </Link>
              <Link
                href="/projects"
                className="border border-slate-700 bg-transparent px-6 py-3 text-xs font-semibold tracking-wider uppercase text-slate-300 hover:border-slate-300 transition"
              >
                Browse Projects
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-6">
          <div className="md:col-span-2 space-y-4">
            <BrandLogo />
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">
              The fastest platform for developers to showcase products and clients to source talent.
            </p>
            <form className="flex max-w-xs gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Updates newsletter"
                className="h-9 flex-1 border border-slate-200 px-3 text-xs outline-none"
              />
              <button
                type="submit"
                className="bg-slate-900 px-4 text-xs font-semibold tracking-wider uppercase text-white hover:bg-black transition"
              >
                Join
              </button>
            </form>
          </div>

          {[
            { title: "Product", links: ["Developers", "Clients", "Projects", "Pricing"] },
            { title: "Resources", links: ["Documentation", "Guides", "Platform Help"] },
            { title: "Company", links: ["About", "Careers", "Contact", "Press"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Use", "Security Info"] },
          ].map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</h3>
              <ul className="space-y-1.5 text-xs text-slate-500">
                {group.links.map((item) => (
                  <li key={item} className="hover:text-slate-900 transition cursor-pointer">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-[10px] text-slate-400">
          <p>© 2026 Find a Client. All rights reserved.</p>
          <p>Swiss Minimalist Design & Development Showcase</p>
        </div>
      </footer>
    </div>
  );
}
