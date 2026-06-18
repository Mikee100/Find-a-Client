"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ContactModal from "@/features/client/contact-modal";
import DashboardNavbar from "@/features/shared/dashboard-navbar";
import { getProject, logout, ProjectDetail } from "@/lib/api";
import { readTokens } from "@/lib/auth";

function formatPrice(project: ProjectDetail): string {
  if (project.pricingType === "FREE") {
    return "Free";
  }

  if (project.pricingType === "CONTACT" || project.price === null || project.price === undefined) {
    return "Contact for pricing";
  }

  return `${project.currency} ${project.price}${project.pricingType === "NEGOTIABLE" ? " negotiable" : ""}`;
}

function cleanHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ClientDiscoverDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const initialTokens = useMemo(() => readTokens(), []);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [state, setState] = useState("Loading project details...");
  const [activeModal, setActiveModal] = useState<"message" | "hire" | null>(null);

  useEffect(() => {
    if (!initialTokens) {
      router.replace("/login");
    }
  }, [initialTokens, router]);

  useEffect(() => {
    if (!initialTokens || !params.slug) {
      return;
    }

    async function loadProject() {
      try {
        setState("Loading project details...");
        const item = await getProject(params.slug);
        setProject(item);
        setState("Project details loaded.");
      } catch (error) {
        setState(error instanceof Error ? error.message : "Project details could not be loaded.");
      }
    }

    loadProject();
  }, [initialTokens, params.slug]);

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  if (!initialTokens) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <DashboardNavbar roleLabel="Client" onSignOut={onLogout} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <Link href="/client/discover" className="text-sm font-semibold text-teal-700">
          Back to discovery
        </Link>

        {!project ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">{state}</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{project.category.replace(/_/g, " ")}</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 md:text-4xl">{project.title}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{project.shortDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.techStack.map((skill) => (
                      <span key={skill} className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <aside className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pricing</p>
                  <p className="mt-1 text-xl font-bold text-neutral-950">{formatPrice(project)}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Developer</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{project.author?.fullName ?? "Developer profile"}</p>
                  {project.author?.location ? <p className="mt-1 text-sm text-neutral-600">{project.author.location}</p> : null}
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => setActiveModal("message")} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
                      Message Developer
                    </button>
                    <button onClick={() => setActiveModal("hire")} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800">
                      Send Hire Request
                    </button>
                  </div>
                </aside>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="text-base font-semibold text-neutral-950">Bio and project summary</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
                  {project.author?.bio || cleanHtml(project.longDescription) || "No detailed summary has been added yet."}
                </p>
              </section>

              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="text-base font-semibold text-neutral-950">Links</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {project.demoUrl ? (
                    <a href={project.demoUrl} className="font-semibold text-teal-700" target="_blank" rel="noreferrer">
                      Demo
                    </a>
                  ) : null}
                  {project.author?.websiteUrl ? (
                    <a href={project.author.websiteUrl} className="font-semibold text-teal-700" target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : null}
                  {project.author?.githubUrl ? (
                    <a href={project.author.githubUrl} className="font-semibold text-teal-700" target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  ) : null}
                  {project.author?.linkedinUrl ? (
                    <a href={project.author.linkedinUrl} className="font-semibold text-teal-700" target="_blank" rel="noreferrer">
                      LinkedIn
                    </a>
                  ) : null}
                  {!project.demoUrl && !project.author?.websiteUrl && !project.author?.githubUrl && !project.author?.linkedinUrl ? (
                    <p className="text-sm text-neutral-600">No public links provided.</p>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="text-base font-semibold text-neutral-950">Projects and demos</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <article className="rounded-md border border-neutral-200 p-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{project.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{project.shortDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.industries.map((industry) => (
                      <span key={industry} className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {industry}
                      </span>
                    ))}
                  </div>
                </article>

                {project.author?.projects?.filter((item) => item.id !== project.id).slice(0, 3).map((item) => (
                  <article key={item.id} className="rounded-md border border-neutral-200 p-3">
                    <Link href={`/client/discover/${item.slug}`} className="text-sm font-semibold text-neutral-900 hover:text-teal-700">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-neutral-600">{item.shortDescription}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="text-base font-semibold text-neutral-950">Tech stack</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span key={tech} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800">
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </section>

      {activeModal && project ? (
        <ContactModal
          mode={activeModal}
          project={project}
          developerName={project.author?.fullName}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </main>
  );
}
