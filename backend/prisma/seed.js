/* eslint-disable no-console */
const { PrismaClient, ProjectCategory, PricingType, ProjectStatus, UserRole, ExperienceLevel, AvailabilityStatus } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const prisma = new PrismaClient();

const SEED_PASSWORD = "mike1234";
const ADMIN_SEED = {
  email: "admin@gmail.com",
  username: "admin",
  fullName: "Platform Admin",
  role: UserRole.ADMIN
};

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
  },
  {
    title: "Headless Commerce Storefront",
    category: ProjectCategory.ECOMMERCE,
    pricingType: PricingType.FIXED,
    price: 7600,
    currency: "USD",
    techStack: ["Next.js", "Shopify", "TypeScript", "Stripe"],
    industries: ["Retail", "Ecommerce"],
    shortDescription: "Headless ecommerce storefront with custom checkout flows and conversion analytics.",
    longDescription:
      "Created a conversion-optimized ecommerce experience with fast product discovery and custom checkout integrations.\n\nProject Intake Details\nProblem: Legacy storefront had low conversion and poor mobile experience.\nSolution: Rebuilt as a headless storefront with performance budgets.\nOutcome: Faster loads and improved checkout completion.\nDuration: 8 weeks\nComplexity: Production-grade"
  },
  {
    title: "Clinic Management System",
    category: ProjectCategory.MANAGEMENT_SYSTEM,
    pricingType: PricingType.CONTACT,
    price: null,
    currency: "USD",
    techStack: ["React", "NestJS", "PostgreSQL", "Redis"],
    industries: ["Healthcare", "Operations"],
    shortDescription: "End-to-end clinic operations suite covering scheduling, billing, and patient workflow.",
    longDescription:
      "Built a clinic operations platform to coordinate appointments, records, and billing with role-based access.\n\nProject Intake Details\nProblem: Clinics relied on disconnected tools and manual reconciliation.\nSolution: Unified management system with workflow automation.\nOutcome: Better data quality and reduced admin overhead.\nDuration: 10 weeks\nComplexity: Enterprise"
  },
  {
    title: "Warehouse Desktop Console",
    category: ProjectCategory.DESKTOP,
    pricingType: PricingType.FIXED,
    price: 5900,
    currency: "USD",
    techStack: ["Electron", "React", "SQLite", "Node.js"],
    industries: ["Logistics", "Supply Chain"],
    shortDescription: "Cross-platform desktop console for warehouse stock control and shipment orchestration.",
    longDescription:
      "Delivered a desktop control center for warehouse teams operating in low-connectivity environments.\n\nProject Intake Details\nProblem: Browser tools failed during unstable warehouse networks.\nSolution: Electron app with robust offline sync and local persistence.\nOutcome: More reliable day-to-day operations and fewer stock errors.\nDuration: 7 weeks\nComplexity: Mid-market"
  },
  {
    title: "Restaurant Delivery Mobile Suite",
    category: ProjectCategory.MOBILE_APP,
    pricingType: PricingType.NEGOTIABLE,
    price: null,
    currency: "USD",
    techStack: ["Flutter", "Firebase", "Node.js", "PostgreSQL"],
    industries: ["Food", "Hospitality"],
    shortDescription: "Consumer and rider mobile suite for restaurant ordering, dispatching, and order tracking.",
    longDescription:
      "Built dual mobile apps for customers and riders with real-time dispatch and order visibility.\n\nProject Intake Details\nProblem: Restaurant chain had fragmented ordering and delayed dispatch.\nSolution: Unified ordering, dispatch, and fulfillment workflows.\nOutcome: Faster delivery turnaround and improved customer retention.\nDuration: 9 weeks\nComplexity: High"
  },
  {
    title: "Document Intelligence API",
    category: ProjectCategory.API,
    pricingType: PricingType.FIXED,
    price: 6300,
    currency: "USD",
    techStack: ["Python", "FastAPI", "PostgreSQL", "S3"],
    industries: ["Legal", "Finance"],
    shortDescription: "Document parsing and extraction API for contracts, invoices, and compliance workflows.",
    longDescription:
      "Implemented a scalable API for extracting structured data from documents and routing review tasks.\n\nProject Intake Details\nProblem: Teams spent hours manually processing high-volume documents.\nSolution: Automated extraction pipeline with confidence scoring.\nOutcome: Faster processing and reduced manual errors.\nDuration: 6 weeks\nComplexity: Advanced"
  },
  {
    title: "Learning Portal Platform",
    category: ProjectCategory.WEB_APP,
    pricingType: PricingType.CONTACT,
    price: null,
    currency: "USD",
    techStack: ["Next.js", "GraphQL", "PostgreSQL", "Redis"],
    industries: ["Education", "SaaS"],
    shortDescription: "Modern learning experience platform with cohort management, progress tracking, and assessments.",
    longDescription:
      "Built an education platform with cohort journeys, assignment pipelines, and mentor dashboards.\n\nProject Intake Details\nProblem: Learning programs lacked progress visibility and engagement tooling.\nSolution: Designed a structured portal with assessment and analytics modules.\nOutcome: Higher completion rates and better learner outcomes.\nDuration: 11 weeks\nComplexity: Enterprise"
  },
  {
    title: "SMB Invoicing Toolkit",
    category: ProjectCategory.OTHER,
    pricingType: PricingType.FREE,
    price: null,
    currency: "USD",
    techStack: ["Vue", "Node.js", "SQLite", "PDF"],
    industries: ["SMB", "Productivity"],
    shortDescription: "Simple invoicing toolkit for small businesses with branded templates and payment reminders.",
    longDescription:
      "Created a lightweight invoicing toolkit for small teams managing cashflow and recurring billing reminders.\n\nProject Intake Details\nProblem: Small businesses needed a no-friction invoicing workflow.\nSolution: Delivered quick invoice generation with reminder automations.\nOutcome: Faster billing cycles and improved payment follow-up.\nDuration: 4 weeks\nComplexity: Lightweight"
  },
  {
    title: "Property Marketplace Experience",
    category: ProjectCategory.WEB_APP,
    pricingType: PricingType.FIXED,
    price: 7100,
    currency: "USD",
    techStack: ["React", "Node.js", "PostgreSQL", "Mapbox"],
    industries: ["Real Estate", "Marketplace"],
    shortDescription: "Real estate marketplace with location search, agent matching, and booking workflows.",
    longDescription:
      "Developed a property discovery experience with rich listing media and guided booking journeys.\n\nProject Intake Details\nProblem: Listings were hard to compare and inquiry flows were weak.\nSolution: Built map-first discovery with clear conversion funnels.\nOutcome: Higher inquiry intent and improved lead quality.\nDuration: 8 weeks\nComplexity: Production-grade"
  },
  {
    title: "Fraud Signals AI Engine",
    category: ProjectCategory.AI_ML,
    pricingType: PricingType.CONTACT,
    price: null,
    currency: "USD",
    techStack: ["Python", "Kafka", "PostgreSQL", "Feature Store"],
    industries: ["FinTech", "Security"],
    shortDescription: "Real-time anomaly and fraud scoring pipeline with explainable decision insights.",
    longDescription:
      "Built a fraud detection engine processing streaming events and generating explainable risk decisions.\n\nProject Intake Details\nProblem: Fraud checks were delayed and lacked decision transparency.\nSolution: Implemented real-time scoring with feature tracing.\nOutcome: Faster detection and more auditable risk decisions.\nDuration: 12 weeks\nComplexity: Advanced"
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

async function ensureSupabaseUser(clients, account) {
  if (!clients) {
    return null;
  }

  const signInAttempt = await clients.anon.auth.signInWithPassword({
    email: account.email,
    password: SEED_PASSWORD
  });

  if (signInAttempt.data?.user?.id) {
    return signInAttempt.data.user.id;
  }

  const createAttempt = await clients.admin.auth.admin.createUser({
    email: account.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      fullName: account.fullName,
      username: account.username,
      role: account.role
    }
  });

  if (createAttempt.data?.user?.id) {
    return createAttempt.data.user.id;
  }

  const listAttempt = await clients.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listAttempt.data?.users?.find((candidate) => candidate.email?.toLowerCase() === account.email.toLowerCase());

  if (!existing) {
    throw new Error(
      `Failed to create or locate Supabase user for ${account.email}: ${createAttempt.error?.message ?? "unknown auth error"}`
    );
  }

  const updateAttempt = await clients.admin.auth.admin.updateUserById(existing.id, {
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      fullName: account.fullName,
      username: account.username,
      role: account.role
    }
  });

  if (updateAttempt.error) {
    throw new Error(`Failed to update Supabase user ${account.email}: ${updateAttempt.error.message}`);
  }

  return existing.id;
}

async function upsertAdminProfile(admin, supabaseUserId) {
  const existingByEmail = await prisma.user.findUnique({ where: { email: admin.email } });
  const userId = supabaseUserId ?? existingByEmail?.id;

  if (!userId) {
    throw new Error(
      `Cannot seed user ${admin.email} without Supabase configuration. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`
    );
  }

  return prisma.user.upsert({
    where: { email: admin.email },
    update: {
      username: admin.username,
      fullName: admin.fullName,
      role: UserRole.ADMIN,
      title: "Platform Administrator",
      bio: "Platform administrator account for moderation and operational control.",
      skills: ["Moderation", "Operations", "Governance"],
      primaryStack: "Administration",
      experienceLevel: ExperienceLevel.SENIOR,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      location: "Remote",
      contactEmail: admin.email,
      publicEmailEnabled: false,
      isVerified: true
    },
    create: {
      id: userId,
      email: admin.email,
      username: admin.username,
      fullName: admin.fullName,
      role: UserRole.ADMIN,
      title: "Platform Administrator",
      bio: "Platform administrator account for moderation and operational control.",
      skills: ["Moderation", "Operations", "Governance"],
      primaryStack: "Administration",
      experienceLevel: ExperienceLevel.SENIOR,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      location: "Remote",
      contactEmail: admin.email,
      publicEmailEnabled: false,
      isVerified: true
    }
  });
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
  const projects = [];

  for (const [index, template] of projectTemplates.entries()) {
    const title = `${template.title} ${index + 1} by ${developer.fullName.split(" ")[0]}`;
    const slug = slugify(`${developer.username}-${template.title}-${index + 1}`);
    const visuals = buildProjectVisuals(developerIndex + 1, index + 1, template.category);

    const project = await prisma.project.upsert({
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
    projects.push(project);
  }

  for (const [index, project] of projects.entries()) {
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
  }
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
    console.log(`[seed] Seeded developer ${developer.email} with ${projectTemplates.length} projects.`);
  }

  const adminSupabaseUserId = await ensureSupabaseUser(supabaseClients, ADMIN_SEED);
  await upsertAdminProfile(ADMIN_SEED, adminSupabaseUserId);
  console.log(`[seed] Seeded admin ${ADMIN_SEED.email}.`);

  const totalDevelopers = await prisma.user.count({ where: { role: UserRole.DEVELOPER } });
  const totalAdmins = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  const totalProjects = await prisma.project.count();

  console.log(`[seed] Done. Developers in DB: ${totalDevelopers}. Admins in DB: ${totalAdmins}. Projects in DB: ${totalProjects}.`);
  console.log(`[seed] Shared password used for seeded accounts: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
