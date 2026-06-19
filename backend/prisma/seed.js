/* eslint-disable no-console */
const { PrismaClient, ProjectCategory, PricingType, ProjectStatus, UserRole, ExperienceLevel, AvailabilityStatus } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const prisma = new PrismaClient();

const SEED_PASSWORD = "mike1234";

const developerSeeds = [
  {
    email: "dennis.kimani@devshowcase.local",
    username: "dennis-kimani",
    fullName: "Dennis Kimani",
    title: "Senior Full Stack Engineer",
    location: "Nairobi, Kenya",
    primaryStack: "React + NestJS",
    skills: ["React", "Next.js", "TypeScript", "NestJS", "PostgreSQL"]
  },
  {
    email: "lilian.achieng@devshowcase.local",
    username: "lilian-achieng",
    fullName: "Lilian Achieng",
    title: "Product-Focused Mobile Developer",
    location: "Kampala, Uganda",
    primaryStack: "React Native + Node",
    skills: ["React Native", "Expo", "Node.js", "TypeScript", "Firebase"]
  },
  {
    email: "samir.hassan@devshowcase.local",
    username: "samir-hassan",
    fullName: "Samir Hassan",
    title: "Backend and API Specialist",
    location: "Dar es Salaam, Tanzania",
    primaryStack: "Node + Prisma",
    skills: ["Node.js", "NestJS", "Prisma", "PostgreSQL", "Redis"]
  },
  {
    email: "grace.njeri@devshowcase.local",
    username: "grace-njeri",
    fullName: "Grace Njeri",
    title: "Cloud and Platform Engineer",
    location: "Kigali, Rwanda",
    primaryStack: "Go + Azure",
    skills: ["Go", "Docker", "Azure", "Terraform", "PostgreSQL"]
  },
  {
    email: "brian.odhiambo@devshowcase.local",
    username: "brian-odhiambo",
    fullName: "Brian Odhiambo",
    title: "AI and Data Product Engineer",
    location: "Mombasa, Kenya",
    primaryStack: "Python + AI APIs",
    skills: ["Python", "FastAPI", "OpenAI", "Vector Search", "TypeScript"]
  }
];

const projectTemplates = [
  {
    title: "Talent Marketplace Platform",
    category: ProjectCategory.WEB_APP,
    pricingType: PricingType.FIXED,
    price: 6800,
    currency: "USD",
    techStack: ["Next.js", "NestJS", "Prisma", "PostgreSQL"],
    industries: ["Recruitment", "SaaS"],
    shortDescription: "Multi-sided talent marketplace with onboarding, discovery, messaging, and conversion tracking.",
    longDescription:
      "Built a marketplace experience that helps clients discover vetted developers faster while giving developers conversion-focused profiles.\n\nProject Intake Details\nProblem: Clients struggled to evaluate developer quality before outreach.\nSolution: Structured profile, trust signals, and guided contact flows.\nOutcome: Faster matching and higher inquiry quality.\nDuration: 8 weeks\nComplexity: Production-grade"
  },
  {
    title: "Field Sales Companion App",
    category: ProjectCategory.MOBILE_APP,
    pricingType: PricingType.NEGOTIABLE,
    price: null,
    currency: "USD",
    techStack: ["React Native", "Expo", "Node.js", "PostgreSQL"],
    industries: ["Retail", "Field Operations"],
    shortDescription: "Offline-first mobile app for field reps to manage leads, visits, and follow-ups.",
    longDescription:
      "Delivered a field productivity app that works online and offline, syncing data in the background to avoid workflow interruption.\n\nProject Intake Details\nProblem: Reps lost data in poor network areas.\nSolution: Offline queue and conflict-safe sync model.\nOutcome: Better coverage and fewer missed updates.\nDuration: 6 weeks\nComplexity: Mid-market"
  },
  {
    title: "Payments and Billing API",
    category: ProjectCategory.API,
    pricingType: PricingType.FIXED,
    price: 5400,
    currency: "USD",
    techStack: ["NestJS", "Prisma", "PostgreSQL", "Redis"],
    industries: ["FinTech", "SaaS"],
    shortDescription: "Secure billing API with subscription lifecycle, invoicing, retries, and audit logs.",
    longDescription:
      "Implemented a hardened billing API with clear service boundaries, observability, and idempotent payment flows.\n\nProject Intake Details\nProblem: Payment retries and state drift caused support load.\nSolution: Idempotency keys and event-driven reconciliation.\nOutcome: Stable billing pipeline and cleaner reporting.\nDuration: 5 weeks\nComplexity: High"
  },
  {
    title: "Operations Control Dashboard",
    category: ProjectCategory.MANAGEMENT_SYSTEM,
    pricingType: PricingType.CONTACT,
    price: null,
    currency: "USD",
    techStack: ["React", "TypeScript", "Node.js", "PostgreSQL"],
    industries: ["Logistics", "Operations"],
    shortDescription: "Role-based operations dashboard for task orchestration, insights, and SLA monitoring.",
    longDescription:
      "Shipped an operations dashboard that unified workflow visibility across multiple teams with performance-first UI patterns.\n\nProject Intake Details\nProblem: Teams managed operations in fragmented tools.\nSolution: One control plane with role-aware actions and analytics.\nOutcome: Lower coordination overhead and faster decisions.\nDuration: 7 weeks\nComplexity: Enterprise"
  },
  {
    title: "AI Support Copilot",
    category: ProjectCategory.AI_ML,
    pricingType: PricingType.FIXED,
    price: 7200,
    currency: "USD",
    techStack: ["Python", "FastAPI", "Vector Search", "Next.js"],
    industries: ["Customer Support", "SaaS"],
    shortDescription: "AI assistant for support teams with retrieval, guardrails, escalation, and analytics.",
    longDescription:
      "Built an AI support copilot that helps agents resolve tickets faster while preserving quality with policy-aware responses.\n\nProject Intake Details\nProblem: Support teams needed faster first-response quality.\nSolution: Retrieval-augmented responses plus escalation rules.\nOutcome: Faster response times and consistent output quality.\nDuration: 9 weeks\nComplexity: Advanced"
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildProjectVisuals(developerIndex, projectIndex, category) {
  const seedBase = developerIndex * 100 + projectIndex * 10;
  const categoryToken = String(category).toLowerCase();

  return {
    backgroundUrl: `https://picsum.photos/seed/devshowcase-bg-${categoryToken}-${seedBase}/1600/900`,
    thumbnailUrl: `https://picsum.photos/seed/devshowcase-thumb-${categoryToken}-${seedBase + 1}/1200/675`,
    screenshotUrls: [
      `https://picsum.photos/seed/devshowcase-shot-${categoryToken}-${seedBase + 2}/1400/900`,
      `https://picsum.photos/seed/devshowcase-shot-${categoryToken}-${seedBase + 3}/1400/900`,
      `https://picsum.photos/seed/devshowcase-shot-${categoryToken}-${seedBase + 4}/1400/900`
    ]
  };
}

function getSupabaseClients() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    anon: createClient(supabaseUrl, supabaseAnonKey, { realtime: { transport: WebSocket } }),
    admin: createClient(supabaseUrl, supabaseServiceRoleKey, { realtime: { transport: WebSocket } })
  };
}

async function ensureSupabaseUser(clients, developer) {
  if (!clients) {
    return null;
  }

  const signInAttempt = await clients.anon.auth.signInWithPassword({
    email: developer.email,
    password: SEED_PASSWORD
  });

  if (signInAttempt.data?.user?.id) {
    return signInAttempt.data.user.id;
  }

  const createAttempt = await clients.admin.auth.admin.createUser({
    email: developer.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      fullName: developer.fullName,
      username: developer.username,
      role: UserRole.DEVELOPER
    }
  });

  if (createAttempt.data?.user?.id) {
    return createAttempt.data.user.id;
  }

  const listAttempt = await clients.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listAttempt.data?.users?.find((candidate) => candidate.email?.toLowerCase() === developer.email.toLowerCase());

  if (!existing) {
    throw new Error(
      `Failed to create or locate Supabase user for ${developer.email}: ${createAttempt.error?.message ?? "unknown auth error"}`
    );
  }

  const updateAttempt = await clients.admin.auth.admin.updateUserById(existing.id, {
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      fullName: developer.fullName,
      username: developer.username,
      role: UserRole.DEVELOPER
    }
  });

  if (updateAttempt.error) {
    throw new Error(`Failed to update Supabase user ${developer.email}: ${updateAttempt.error.message}`);
  }

  return existing.id;
}

async function upsertDeveloperProfile(developer, supabaseUserId) {
  const existingByEmail = await prisma.user.findUnique({ where: { email: developer.email } });
  const userId = supabaseUserId ?? existingByEmail?.id;

  if (!userId) {
    throw new Error(
      `Cannot seed user ${developer.email} without Supabase configuration. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`
    );
  }

  return prisma.user.upsert({
    where: { email: developer.email },
    update: {
      username: developer.username,
      fullName: developer.fullName,
      role: UserRole.DEVELOPER,
      title: developer.title,
      bio: `${developer.fullName} builds reliable digital products focused on measurable business outcomes.`,
      skills: developer.skills,
      primaryStack: developer.primaryStack,
      experienceLevel: ExperienceLevel.SENIOR,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      location: developer.location,
      contactEmail: developer.email,
      publicEmailEnabled: true,
      websiteUrl: `https://${developer.username}.portfolio.dev`,
      githubUrl: `https://github.com/${developer.username.replace(/-/g, "")}`,
      linkedinUrl: `https://www.linkedin.com/in/${developer.username}`,
      isVerified: true
    },
    create: {
      id: userId,
      email: developer.email,
      username: developer.username,
      fullName: developer.fullName,
      role: UserRole.DEVELOPER,
      title: developer.title,
      bio: `${developer.fullName} builds reliable digital products focused on measurable business outcomes.`,
      skills: developer.skills,
      primaryStack: developer.primaryStack,
      experienceLevel: ExperienceLevel.SENIOR,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      location: developer.location,
      contactEmail: developer.email,
      publicEmailEnabled: true,
      websiteUrl: `https://${developer.username}.portfolio.dev`,
      githubUrl: `https://github.com/${developer.username.replace(/-/g, "")}`,
      linkedinUrl: `https://www.linkedin.com/in/${developer.username}`,
      isVerified: true
    }
  });
}

async function upsertProjectsForDeveloper(developer, userId, developerIndex) {
  const upserts = projectTemplates.map((template, index) => {
    const title = `${template.title} ${index + 1} by ${developer.fullName.split(" ")[0]}`;
    const slug = slugify(`${developer.username}-${template.title}-${index + 1}`);
    const visuals = buildProjectVisuals(developerIndex + 1, index + 1, template.category);

    return prisma.project.upsert({
      where: { slug },
      update: {
        title,
        shortDescription: template.shortDescription,
        longDescription: template.longDescription,
        category: template.category,
        status: ProjectStatus.PUBLISHED,
        techStack: template.techStack,
        industries: template.industries,
        pricingType: template.pricingType,
        price: template.price,
        currency: template.currency,
        isFeatured: index === 0,
        viewCount: 20 + index * 11,
        likeCount: 5 + index * 3,
        inquiryCount: 2 + index,
        authorId: userId,
        backgroundUrl: visuals.backgroundUrl,
        thumbnailUrl: visuals.thumbnailUrl,
        demoUrl: `https://demo.${developer.username}.${index + 1}.example.com`
      },
      create: {
        slug,
        title,
        shortDescription: template.shortDescription,
        longDescription: template.longDescription,
        category: template.category,
        status: ProjectStatus.PUBLISHED,
        techStack: template.techStack,
        industries: template.industries,
        pricingType: template.pricingType,
        price: template.price,
        currency: template.currency,
        isFeatured: index === 0,
        viewCount: 20 + index * 11,
        likeCount: 5 + index * 3,
        inquiryCount: 2 + index,
        authorId: userId,
        backgroundUrl: visuals.backgroundUrl,
        thumbnailUrl: visuals.thumbnailUrl,
        demoUrl: `https://demo.${developer.username}.${index + 1}.example.com`
      }
    });
  });

  const projects = await Promise.all(upserts);

  await Promise.all(
    projects.map(async (project, index) => {
      const visuals = buildProjectVisuals(developerIndex + 1, index + 1, project.category);

      await prisma.projectMedia.deleteMany({
        where: {
          projectId: project.id,
          type: "SCREENSHOT"
        }
      });

      await prisma.projectMedia.createMany({
        data: visuals.screenshotUrls.map((url, order) => ({
          projectId: project.id,
          type: "SCREENSHOT",
          url,
          order
        }))
      });
    })
  );
}

async function main() {
  const supabaseClients = getSupabaseClients();

  if (!supabaseClients) {
    console.warn("[seed] Supabase env vars are missing. This seed requires Supabase auth setup to create login-ready accounts.");
  }

  for (const [developerIndex, developer] of developerSeeds.entries()) {
    const supabaseUserId = await ensureSupabaseUser(supabaseClients, developer);
    const user = await upsertDeveloperProfile(developer, supabaseUserId);
    await upsertProjectsForDeveloper(developer, user.id, developerIndex);
    console.log(`[seed] Seeded developer ${developer.email} with 5 projects.`);
  }

  const totalDevelopers = await prisma.user.count({ where: { role: UserRole.DEVELOPER } });
  const totalProjects = await prisma.project.count();

  console.log(`[seed] Done. Developers in DB: ${totalDevelopers}. Projects in DB: ${totalProjects}.`);
  console.log(`[seed] Shared password used for seeded developer accounts: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
