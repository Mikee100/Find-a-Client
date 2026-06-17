"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import BrandLogo from "@/components/ui/brand-logo";

type Stat = { label: string; value: number; suffix?: string };
type FAQ = { question: string; answer: string };
type Developer = {
  id: string;
  name: string;
  role: string;
  country: string;
  tech: string[];
  rating: string;
  completed: number;
  category: string;
};
type Project = {
  id: string;
  title: string;
  description: string;
  tech: string[];
  views: number;
  likes: number;
  feedback: string;
};

const stats: Stat[] = [
  { label: "Developers", value: 15000, suffix: "+" },
  { label: "Projects", value: 4200, suffix: "+" },
  { label: "Companies", value: 1900, suffix: "+" },
  { label: "Contracts Facilitated", value: 8, suffix: "M+" },
];

const categories = [
  "Frontend",
  "Backend",
  "Mobile",
  "Desktop",
  "AI",
  "Cloud",
  "DevOps",
  "UI/UX",
  "Cybersecurity",
  "Data Science",
  "Blockchain",
  "Game Development",
];

const developers: Developer[] = [
  {
    id: "d1",
    name: "Ari Bello",
    role: "Senior Frontend Engineer",
    country: "Nigeria",
    tech: ["React", "TypeScript", "Next.js"],
    rating: "4.9",
    completed: 31,
    category: "Frontend",
  },
  {
    id: "d2",
    name: "Samir Khan",
    role: "Backend Architect",
    country: "UK",
    tech: ["Node", "PostgreSQL", "Redis"],
    rating: "4.8",
    completed: 27,
    category: "Backend",
  },
  {
    id: "d3",
    name: "Rita Liu",
    role: "Mobile Product Engineer",
    country: "Canada",
    tech: ["React Native", "Kotlin", "Firebase"],
    rating: "5.0",
    completed: 19,
    category: "Mobile",
  },
  {
    id: "d4",
    name: "Leo Martins",
    role: "AI Solutions Developer",
    country: "Portugal",
    tech: ["Python", "LLM", "Vector DB"],
    rating: "4.9",
    completed: 22,
    category: "AI",
  },
];

const projects: Project[] = [
  {
    id: "p1",
    title: "Payments Orchestration Dashboard",
    description:
      "Operational command center with real-time alerting and settlement analytics.",
    tech: ["Next.js", "Node.js", "Stripe"],
    views: 2480,
    likes: 354,
    feedback: "Shipped in 5 weeks with zero regressions.",
  },
  {
    id: "p2",
    title: "Healthcare Intake Platform",
    description:
      "Secure onboarding and case management flow for distributed care teams.",
    tech: ["React", "Prisma", "Postgres"],
    views: 1945,
    likes: 269,
    feedback: "Quality and communication were exceptional.",
  },
  {
    id: "p3",
    title: "B2B Growth Analytics Suite",
    description:
      "Executive-ready metrics, cohorts, and forecasting in one product workspace.",
    tech: ["TypeScript", "Recharts", "Redis"],
    views: 2131,
    likes: 307,
    feedback: "Helped us close enterprise clients faster.",
  },
];

const faqs: FAQ[] = [
  {
    question: "How are developers verified?",
    answer:
      "Profiles are validated by portfolio quality, project history, and consistency signals from platform activity.",
  },
  {
    question: "Can clients hire globally?",
    answer:
      "Yes. Clients can discover, message, and hire developers across regions with role, stack, and outcome filters.",
  },
  {
    question: "What makes AI matching different?",
    answer:
      "Our matching model ranks candidates by project fit, stack depth, and delivery context, not keywords alone.",
  },
  {
    question: "Is there a free plan for developers?",
    answer:
      "Yes. Developers can build a full profile and portfolio on the free plan with premium options for visibility boosts.",
  },
];

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 900;
    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      setCount(Math.floor(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const visibleDevelopers = useMemo(() => {
    if (selectedCategory === "All") return developers;
    return developers.filter((dev) => dev.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header
        className={`sticky top-0 z-40 border-b transition ${
          scrolled ? "border-slate-200 bg-white/90 backdrop-blur" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
            <Link href="/">Home</Link>
            <Link href="/developers/profile">Developers</Link>
            <Link href="/client/dashboard">Find Talent</Link>
            <Link href="/projects">Projects</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#about">About</Link>
            <Link href="#resources">Resources</Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                aria-label="Search"
                placeholder="Search"
                className="h-9 w-36 border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none"
              />
            </label>
            <Link href="/login" className="px-3 py-2 text-sm font-semibold text-slate-700">
              Login
            </Link>
            <Link href="/register" className="border border-slate-200 px-3 py-2 text-sm font-semibold">
              Sign Up
            </Link>
            <Link href="/register" className="bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="border border-slate-200 p-2 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border-t border-slate-200 bg-white p-4 lg:hidden"
            >
              <div className="grid gap-2 text-sm">
                <Link href="/projects" onClick={() => setMobileOpen(false)}>
                  Projects
                </Link>
                <Link href="/developers/profile" onClick={() => setMobileOpen(false)}>
                  Developers
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="bg-slate-800 px-3 py-2 text-center font-semibold text-white"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#e2e8f0_0%,transparent_42%)]" />
          <div className="relative mx-auto w-full max-w-7xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 border-b border-slate-300 pb-1 text-xs font-semibold text-slate-600"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-700" />
              AI-powered hiring platform
            </motion.p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Where Great Developers Meet Serious Clients.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
              Discover verified developers, showcase your work, connect with businesses, and hire with confidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/developers/profile" className="border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                Explore Developers
              </Link>
            </div>

            <div className="mt-8 grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="border-l-2 border-slate-500 pl-3">
                  <p className="text-2xl font-bold text-slate-800">
                    <AnimatedCounter value={item.value} suffix={item.suffix} />
                  </p>
                  <p className="text-sm text-slate-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="border-t border-slate-200 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why choose Find a Client</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built for premium hiring outcomes</h2>
            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Verified Developers",
                  text: "Every profile showcases real work, proof of delivery, and verified skills.",
                },
                {
                  icon: Brain,
                  title: "AI Talent Matching",
                  text: "Discover developers based on requirements, context, and project signals.",
                },
                {
                  icon: Workflow,
                  title: "Project Portfolio Depth",
                  text: "Review demos, stacks, and delivery outcomes before hiring.",
                },
              ].map((feature) => (
                <div key={feature.title} className="border-l-2 border-slate-200 pl-4">
                  <feature.icon className="h-5 w-5 text-slate-700" />
                  <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="resources" className="border-t border-slate-200 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Featured developers</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Developer directory</h2>

            <div className="mt-6 flex flex-wrap gap-2">
              {["All", ...categories].slice(0, 7).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`border px-3 py-1.5 text-xs font-semibold ${
                    selectedCategory === category
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[740px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="py-3">Developer</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Stack</th>
                    <th className="py-3">Rating</th>
                    <th className="py-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDevelopers.map((dev) => (
                    <tr key={dev.id} className="border-b border-slate-100">
                      <td className="py-3 font-semibold">
                        {dev.name} <span className="font-normal text-slate-500">({dev.country})</span>
                      </td>
                      <td className="py-3 text-slate-600">{dev.role}</td>
                      <td className="py-3 text-slate-600">{dev.tech.join(", ")}</td>
                      <td className="py-3 text-slate-600">{dev.rating}</td>
                      <td className="py-3 text-slate-600">{dev.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Featured projects</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Recent outcomes</h2>
            <div className="mt-6 space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border-b border-slate-200 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">{project.title}</h3>
                    <span className="text-xs text-slate-500">
                      {project.views.toLocaleString()} views • {project.likes} likes
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{project.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Stack: {project.tech.join(", ")}</p>
                  <p className="mt-1 text-xs text-slate-500">{project.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI matching showcase</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Describe your project. Get ranked talent in seconds.</h2>
            <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-600">
              Our AI analyzes portfolio depth, domain fit, and delivery history to recommend the best developers for your exact scope.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {[
                "Project intent parsed with context-aware signals",
                "Top matches ranked by confidence score",
                "Suggested interview shortlist generated instantly",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing preview</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple plans for developers and clients</h2>
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold">Developer plans</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Free: Build profile and portfolio</li>
                  <li>Professional: Priority ranking and insights</li>
                  <li>Enterprise: Team visibility and API access</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Client plans</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Starter: Basic search and messaging</li>
                  <li>Business: Advanced filters and AI shortlist</li>
                  <li>Enterprise: Hiring workflows and dedicated support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Answers for teams ready to move faster</h2>
            <div className="mt-6 border-y border-slate-200">
              {faqs.map((faq, idx) => (
                <article key={faq.question} className="border-b border-slate-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setActiveFaq((prev) => (prev === idx ? null : idx))}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left"
                  >
                    <span className="text-sm font-semibold">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 transition ${activeFaq === idx ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {activeFaq === idx ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="pb-4 text-sm text-slate-600">{faq.answer}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-200 px-4 py-14 text-slate-900 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Final CTA</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ready to find your next client or hire your next developer?</h2>
            <p className="mt-2 text-sm text-slate-600">Join a premium network where serious builders and serious businesses connect fast.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/register" className="bg-slate-800 px-5 py-3 text-sm font-semibold text-white">
                Get Started
              </Link>
              <Link href="/projects" className="border border-slate-400 px-5 py-3 text-sm font-semibold text-slate-800">
                Explore Projects
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <BrandLogo />
            <p className="mt-3 max-w-sm text-sm text-slate-600">The fastest place where developers meet serious clients.</p>
            <form className="mt-4 flex max-w-sm gap-2">
              <input type="email" placeholder="Newsletter email" className="h-10 flex-1 border border-slate-200 bg-slate-50 px-3 text-sm outline-none" />
              <button type="submit" className="bg-slate-800 px-4 text-sm font-semibold text-white">Join</button>
            </form>
          </div>

          {[
            { title: "Product", links: ["Developers", "Clients", "Projects", "Pricing"] },
            { title: "Resources", links: ["Docs", "Blog", "Guides", "Help Center"] },
            { title: "Company", links: ["About", "Careers", "Contact", "Press"] },
            { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Security"] },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {group.links.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
          <p>© 2026 Find a Client. All rights reserved.</p>
          <p>Built for developers and clients who ship fast.</p>
        </div>
      </footer>
    </div>
  );
}
