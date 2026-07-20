const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000").replace(/\/+$/, "");
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "csrf_token";

interface ApiErrorBody {
  message?: string | string[];
  error?: {
    message?: string | string[];
  };
}

export interface CreatedThread {
  id: string;
  participantAId: string;
  participantBId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadPayload {
  recipientId: string;
  projectId?: string;
  initialMessage?: string;
}

export interface ProjectInquiryPayload {
  type?: "ASK_QUESTION" | "OFFER_PROJECT";
  message?: string;
}

export interface ProjectLikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface CreateHireRequestPayload {
  developerId: string;
  projectId?: string;
  threadId?: string;
  brief: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  timelineDays?: number;
}

export interface HireRequestResponse {
  id: string;
  clientId: string;
  developerId: string;
  projectId: string | null;
  threadId: string | null;
  status: "PENDING" | "REVIEWING" | "PROPOSAL_SENT" | "NEGOTIATING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  brief: string;
  budgetAmount: string | null;
  budgetCurrency: string | null;
  timelineDays: number | null;
  proposalMessage: string | null;
  proposalAmount: string | null;
  proposalCurrency: string | null;
  proposalTimelineDays: number | null;
  proposedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  developer?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  project?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  thread?: {
    id: string;
    updatedAt: string;
  } | null;
}

export interface ListHireRequestsParams {
  scope?: "all" | "sent" | "received";
  status?: HireRequestResponse["status"];
  limit?: number;
}

export interface SubmitHireRequestProposalPayload {
  proposalMessage: string;
  proposalAmount?: number;
  proposalCurrency?: string;
  proposalTimelineDays?: number;
}

export type MilestoneStatus =
  | "PENDING"
  | "FUNDED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "RELEASED"
  | "DISPUTED"
  | "REFUNDED";

export interface PaymentSummary {
  id: string;
  stripePaymentIntentId: string;
  amount: string;
  feeAmount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface PayoutSummary {
  id: string;
  developerId: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface DisputeSummary {
  id: string;
  raisedBy: "CLIENT" | "DEVELOPER" | "SYSTEM";
  status: string;
  reason: string;
  createdAt: string;
}

export interface MilestoneResponse {
  id: string;
  hireRequestId: string;
  title: string;
  amount: string;
  currency: string;
  status: MilestoneStatus;
  dueDate: string | null;
  fundedAt: string | null;
  submittedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentSummary[];
  payouts?: PayoutSummary[];
  disputes?: DisputeSummary[];
}

export interface MilestoneEventResponse {
  id: string;
  milestoneId: string;
  eventType: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateMilestonePayload {
  title: string;
  amount: number;
  currency?: string;
  dueDate?: string;
}

export interface FundMilestonePayload {
  paymentMethodId?: string;
  returnUrl?: string;
}

export interface FundMilestoneResponse {
  milestoneId: string;
  status: MilestoneStatus;
  payment: PaymentSummary;
  fundedAt: string | null;
  paymentIntentClientSecret: string | null;
}

export interface SubmitMilestonePayload {
  deliveryNote?: string;
  artifacts?: string[];
}

export interface ReleaseMilestonePayload {
  note?: string;
}

export interface ReleaseMilestoneResponse {
  milestoneId: string;
  status: MilestoneStatus;
  releasedAt: string | null;
  payout: PayoutSummary;
  reviewUnlocked: boolean;
}

export interface CreateDisputePayload {
  reason: string;
}

export interface ResolveDisputePayload {
  resolution: "RESOLVED_RELEASE" | "RESOLVED_REFUND";
  note?: string;
}

export interface PayoutAccountStatus {
  developerId: string;
  provider: string;
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingRequired: boolean;
  onboardingUrl: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
let inFlightRefresh: Promise<boolean> | null = null;
let inFlightSession: Promise<AuthSession> | null = null;
let cachedSession: AuthSession | null = null;
let cachedSessionAt = 0;
const SESSION_CACHE_TTL_MS = 10_000;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const token = `${name}=`;
  for (const chunk of document.cookie.split(";")) {
    const part = chunk.trim();
    if (part.startsWith(token)) {
      return decodeURIComponent(part.slice(token.length));
    }
  }

  return null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
  role: AppRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AppRole = "DEVELOPER" | "CLIENT" | "ADMIN";

interface RegisterResponse {
  userId: string;
  role: AppRole;
  verificationRequired: true;
}

interface LoginResponse {
  role: AppRole;
  supabaseAccessToken?: string | null;
  supabaseRefreshToken?: string | null;
}

interface OAuthSessionResponse {
  role: AppRole;
}

interface VerifyEmailResponse {
  verified: true;
  role: AppRole;
}

interface ForgotPasswordResponse {
  sent: true;
}

interface ResetPasswordResponse {
  reset: true;
  role: AppRole;
}

interface ChangePasswordResponse {
  changed: true;
  role: AppRole;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface OAuthRedirectOptions {
  next?: string;
  intent?: string;
}

export interface AuthSession {
  sub: string;
  email: string;
  role: AppRole;
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  role: AppRole;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  contactEmail: string | null;
  publicEmailEnabled: boolean;
  educationEntries: string[];
  certificationEntries: string[];
  languageEntries: string[];
  phoneNumber: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  githubUsername: string | null;
  githubVerifiedAt: string | null;
  linkedinUrl: string | null;
}

export interface GithubVerificationResult {
  verified: true;
  githubUsername: string;
  githubUrl: string;
  verifiedAt: string;
}

export interface DeveloperSearchItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  projectCount: number;
  profileCompleteness: number;
  score: number;
  scoreBreakdown: {
    completeness: number;
    skillMatches: number;
    requestedSkills: number;
    projectEngagement: number;
  };
  updatedAt: string;
}

export interface PublicDeveloperProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  skills: string[];
  primaryStack: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  contactEmail: string | null;
  projects: Array<{
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    techStack: string[];
    likeCount: number;
    viewCount: number;
    inquiryCount: number;
    thumbnailUrl: string | null;
    backgroundUrl: string | null;
    demoUrl: string | null;
    createdAt: string;
  }>;
}

export interface SearchDevelopersParams {
  q?: string;
  skills?: string[];
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus?: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location?: string;
  limit?: number;
}

export interface AiClientMatchPayload {
  brief: string;
  projectType?: string;
  requiredSkills?: string[];
  limit?: number;
  includeReasoning?: boolean;
}

export interface AiClientMatchResponse {
  brief: string;
  briefAnalysis: {
    projectType: string;
    detectedSkills: string[];
    confidence: number;
  };
  matches: Array<{
    rank: number;
    fitScore: number;
    reason: string;
    nextMessageSuggestion: string;
    developer: {
      id: string;
      username: string;
      fullName: string;
      title: string | null;
      primaryStack: string | null;
      skills: string[];
    };
    scoreBreakdown: Record<string, number>;
  }>;
  meta: {
    model: string;
    provider?: string;
    fallbackUsed?: boolean;
    fallbackReason?: string | null;
    generatedAt: string;
    includeReasoning: boolean;
  };
}

export interface AiProfileImprovementsResponse {
  profileCompleteness: {
    percentage: number;
    completedFields: number;
    totalFields: number;
    missingFields: string[];
    nextAction: string | null;
  };
  suggestions: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    impact: string;
  }>;
  summary: {
    strongestSignal: string;
    biggestGap: string | null;
    estimatedDiscoveryLift: string;
  };
  meta: {
    model: string;
    provider?: string;
    fallbackUsed?: boolean;
    fallbackReason?: string | null;
    generatedAt: string;
  };
}

export interface AiProposalTemplatePayload {
  brief: string;
  projectType?: string;
  budgetRange?: string;
  timelinePreference?: string;
  skills?: string[];
}

export interface AiProposalTemplateResponse {
  proposal: {
    opening: string;
    skillsHighlight: string[];
    approach: string[];
    timeline: string;
    budget: string;
    clarifyingQuestion: string;
    closing: string;
  };
  meta: {
    model: string;
    provider?: string;
    fallbackUsed?: boolean;
    fallbackReason?: string | null;
    generatedAt: string;
  };
}

export interface ListProjectsParams {
  category?: ProjectCategory;
  techStack?: string[];
  industries?: string[];
  pricingType?: PricingType;
  search?: string;
  sortBy?: "best_matches" | "newest" | "oldest" | "popular" | "most_viewed" | "price_asc" | "price_desc";
  minPrice?: string;
  maxPrice?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface CursorPageMeta {
  hasNext: boolean;
  nextCursor?: string;
  page?: number;
  totalPages?: number;
  totalItems?: number;
}

export interface PaginatedProjectList {
  items: ProjectListItem[];
  meta: CursorPageMeta;
}

export interface ProjectRankingBreakdown {
  freshness: number;
  quality: number;
  completeness: number;
  activity: number;
  featuredBoost: number;
  weightedSignals: number;
}

export interface AdminRankedProjectListItem extends ProjectListItem {
  score: number;
  scoreBreakdown: ProjectRankingBreakdown;
  updatedAt?: string;
  industries?: string[];
}

export interface AdminPaginatedRankedProjects {
  items: AdminRankedProjectListItem[];
  meta: CursorPageMeta;
}

export type ProjectCategory =
  | "WEB_APP"
  | "MOBILE_APP"
  | "API"
  | "DESKTOP"
  | "AI_ML"
  | "ECOMMERCE"
  | "MANAGEMENT_SYSTEM"
  | "OTHER";

export type PricingType = "FIXED" | "NEGOTIABLE" | "FREE" | "CONTACT";
export type ProjectMediaType = "IMAGE" | "VIDEO" | "SCREENSHOT";

export type NotificationType =
  | "NEW_MESSAGE"
  | "NEW_QUESTION"
  | "NEW_REVIEW"
  | "PROJECT_FEATURED"
  | "DEAL_INTEREST";

interface ProjectResponse {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  roleInProject: string | null;
  repositoryUrl: string | null;
  category: ProjectCategory;
  techStack: string[];
  pricingType: PricingType;
  price: number | string | null;
  currency: string;
  thumbnailUrl: string | null;
  backgroundUrl: string | null;
  likeCount: number;
  viewCount: number;
  inquiryCount: number;
  qualityScore: number;
  createdAt: string;
  author?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    availabilityStatus: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
    location: string | null;
  };
}

export interface ProjectDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  roleInProject: string | null;
  repositoryUrl: string | null;
  category: ProjectCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack: string[];
  industries: string[];
  pricingType: PricingType;
  price: number | string | null;
  currency: string;
  demoUrl: string | null;
  backgroundUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  likeCount: number;
  viewCount: number;
  inquiryCount: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    username: string;
  };
  media: Array<{
    id: string;
    type: ProjectMediaType;
    url: string;
    caption: string | null;
    order: number;
  }>;
}

interface SavedProjectEntry {
  id: string;
  project: {
    id: string;
    slug: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  };
}

export interface LikedProjectEntry {
  projectId: string;
  createdAt: string;
  project: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    category: ProjectCategory;
    techStack: string[];
    pricingType: PricingType;
    price: number | string | null;
    currency: string;
    likeCount: number;
    viewCount: number;
    inquiryCount: number;
    thumbnailUrl: string | null;
    backgroundUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface MyProjectListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  roleInProject: string | null;
  repositoryUrl: string | null;
  category: ProjectCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack: string[];
  likeCount: number;
  viewCount: number;
  qualityScore: number;
  thumbnailUrl: string | null;
  backgroundUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadSummary {
  id: string;
  participantAId: string;
  participantBId: string;
  projectId: string | null;
  project?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  participantA?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  participantB?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  updatedAt: string;
  unreadCount: number;
  messages: Array<{
    id: string;
    senderId?: string;
    content: string;
    createdAt: string;
  }>;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  attachments?: Array<{
    id: string;
    url: string;
    publicId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export interface MessagePageMeta {
  hasNext: boolean;
  nextCursor?: string;
}

export interface PaginatedThreadMessages {
  items: ThreadMessage[];
  meta: MessagePageMeta;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadNotificationsCount {
  unread: number;
}

export interface AdminSystemUser {
  id: string;
  role: AppRole;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  title?: string | null;
  location: string | null;
  isVerified: boolean;
  createdAt: string;
  projectsCount?: number;
  hireRequestsCount?: number;
}

export interface AdminUsersOverview {
  developers: AdminSystemUser[];
  clients: AdminSystemUser[];
}

export interface AdminUserDetail extends AdminSystemUser {
  updatedAt: string;
  counts: {
    projects: number;
    sentHireRequests: number;
    receivedHireRequests: number;
    sentMessages: number;
  };
  accountState: {
    disabled: boolean;
    bannedUntil: string | null;
    lastSignInAt: string | null;
  };
}

export interface AdminDeleteUserResponse {
  deleted: true;
  userId: string;
}

export interface AdminPerformanceRecentRequest {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  happenedAt: string;
}

export interface AdminPerformanceSummary {
  routeCount: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  averageLatencyMs: number;
  recentRequests: AdminPerformanceRecentRequest[];
}

export interface AdminPerformanceRouteMetric {
  method: string;
  path: string;
  count: number;
  errorCount: number;
  errorRate: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  lastStatusCode: number;
  lastCalledAt: string;
}

export interface ProfileCompleteness {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  nextAction: string | null;
}

export interface DeveloperDashboardData {
  profile: CurrentUserProfile;
  threads: ThreadSummary[];
  notifications: NotificationItem[];
  savedProjects: SavedProjectEntry[];
  myProjects: MyProjectListItem[];
  completeness: ProfileCompleteness;
  recommendedProjects: ProjectListItem[];
}

export interface UpdateProfilePayload {
  fullName?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  primaryStack?: string;
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  availabilityStatus?: "AVAILABLE" | "BUSY" | "NOT_ACCEPTING_WORK";
  location?: string;
  contactEmail?: string;
  publicEmailEnabled?: boolean;
  educationEntries?: string[];
  certificationEntries?: string[];
  languageEntries?: string[];
  phoneNumber?: string;
  websiteUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface CreateProjectPayload {
  title: string;
  shortDescription: string;
  longDescription: string;
  roleInProject?: string;
  repositoryUrl?: string;
  category: ProjectCategory;
  techStack: string[];
  industries: string[];
  pricingType: PricingType;
  price?: number;
  currency?: string;
  demoUrl?: string;
  backgroundUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  screenshots?: string[];
}

export interface UpdateProjectPayload {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  roleInProject?: string;
  repositoryUrl?: string | null;
  category?: ProjectCategory;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  techStack?: string[];
  industries?: string[];
  pricingType?: PricingType;
  price?: number;
  currency?: string;
  demoUrl?: string | null;
  backgroundUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  screenshots?: string[];
}

export interface UploadMediaOptions {
  projectId?: string;
  mediaType?: "IMAGE" | "VIDEO" | "SCREENSHOT" | "THUMBNAIL";
  caption?: string;
}

function normalizeOptionalUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.error?.message)) {
      return body.error.message.join(", ");
    }

    if (typeof body.error?.message === "string") {
      return body.error.message;
    }
  } catch {
    // No-op: fallback message below.
  }

  return `Request failed (${response.status})`;
}

async function requestJson<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  options?: { body?: TBody; allowRetryOn401?: boolean; headers?: Record<string, string> }
): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const hasBody = options?.body !== undefined;
  const allowRetryOn401 = options?.allowRetryOn401 ?? true;
  const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

  const send = async (): Promise<Response> => {
    const csrfToken = isMutation ? readCookie(CSRF_COOKIE_NAME) : null;

    return fetch(`${API_BASE_URL}${normalizedPath}`, {
      method,
      credentials: "include",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(isMutation && csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(options?.headers ?? {})
      },
      body: hasBody ? JSON.stringify(options?.body) : undefined
    });
  };

  const reachabilityMessage = `Unable to reach the server. Confirm backend is running on ${API_BASE_URL}.`;

  let response: Response;
  try {
    response = await send();
  } catch {
    throw new Error(reachabilityMessage);
  }

  if (response.status === 401 && allowRetryOn401 && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      let retryResponse: Response;
      try {
        retryResponse = await send();
      } catch {
        throw new Error(reachabilityMessage);
      }
      if (!retryResponse.ok) {
        throw new Error(await parseError(retryResponse));
      }

      const retryPayload = (await retryResponse.json()) as TResponse | ApiEnvelope<TResponse>;
      if (
        typeof retryPayload === "object" &&
        retryPayload !== null &&
        "success" in retryPayload &&
        "data" in retryPayload
      ) {
        return (retryPayload as ApiEnvelope<TResponse>).data;
      }

      return retryPayload as TResponse;
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TResponse | ApiEnvelope<TResponse>;

  if (typeof payload === "object" && payload !== null && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<TResponse>).data;
  }

  return payload as TResponse;
}

async function postJson<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  return requestJson<TResponse, TBody>("POST", path, { body });
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<RegisterResponse, RegisterPayload>("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<LoginResponse, LoginPayload>("/auth/login", payload);
}

export async function completeOAuthSession(accessToken: string): Promise<OAuthSessionResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return requestJson<OAuthSessionResponse, { accessToken: string }>("POST", "/auth/oauth/session", {
    body: { accessToken }
  });
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<VerifyEmailResponse, VerifyEmailPayload>("/auth/verify-email", payload);
}

export async function resendVerification(payload: ResendVerificationPayload): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse, ResendVerificationPayload>("/auth/resend-verification", payload);
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse, ForgotPasswordPayload>("/auth/forgot-password", payload);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<ResetPasswordResponse, ResetPasswordPayload>("/auth/reset-password", payload);
}

export async function changePassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  cachedSession = null;
  cachedSessionAt = 0;
  return postJson<ChangePasswordResponse, ChangePasswordPayload>("/auth/change-password", payload);
}

export async function refreshSession(): Promise<boolean> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      await requestJson<{ refreshed: true }, Record<string, never>>("POST", "/auth/refresh", {
        body: {},
        allowRetryOn401: false
      });
      return true;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export async function logout(): Promise<void> {
  await postJson<{ loggedOut: true }, Record<string, never>>("/auth/logout", {});
  cachedSession = null;
  cachedSessionAt = 0;
}

export async function logoutEverywhere(): Promise<void> {
  await postJson<{ loggedOutAll: true }, Record<string, never>>("/auth/logout-all", {});
  cachedSession = null;
  cachedSessionAt = 0;
}

export async function getAuthSession(): Promise<AuthSession> {
  const now = Date.now();
  if (cachedSession && now - cachedSessionAt < SESSION_CACHE_TTL_MS) {
    return cachedSession;
  }

  if (inFlightSession) {
    return inFlightSession;
  }

  inFlightSession = requestJson<AuthSession>("GET", "/auth/session")
    .then((session) => {
      cachedSession = session;
      cachedSessionAt = Date.now();
      return session;
    })
    .catch((error) => {
      cachedSession = null;
      cachedSessionAt = 0;
      throw error;
    })
    .finally(() => {
      inFlightSession = null;
    });

  return inFlightSession;
}

function buildOAuthRedirectPath(provider: "google" | "github", options: OAuthRedirectOptions = {}): string {
  const search = new URLSearchParams();

  if (options.next) {
    search.set("next", options.next);
  }

  if (options.intent) {
    search.set("intent", options.intent);
  }

  const query = search.toString();
  return query ? `/auth/${provider}?${query}` : `/auth/${provider}`;
}

export async function getGoogleOAuthRedirect(options: OAuthRedirectOptions = {}): Promise<{ url: string }> {
  return requestJson<{ url: string }>("GET", buildOAuthRedirectPath("google", options));
}

export async function getGithubOAuthRedirect(options: OAuthRedirectOptions = {}): Promise<{ url: string }> {
  return requestJson<{ url: string }>("GET", buildOAuthRedirectPath("github", options));
}

export async function verifyGithubOwnership(): Promise<GithubVerificationResult> {
  return requestJson<GithubVerificationResult, Record<string, never>>("POST", "/auth/github/verify", {
    body: {}
  });
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  const normalizedPayload: UpdateProfilePayload = {
    ...payload,
    websiteUrl: normalizeOptionalUrl(payload.websiteUrl),
    githubUrl: normalizeOptionalUrl(payload.githubUrl),
    linkedinUrl: normalizeOptionalUrl(payload.linkedinUrl)
  };

  await requestJson<unknown, UpdateProfilePayload>("PUT", "/users/me", { body: normalizedPayload });
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  return requestJson<CurrentUserProfile>("GET", "/users/me");
}

export async function getDeveloperDashboardData(): Promise<DeveloperDashboardData> {
  return requestJson<DeveloperDashboardData>("GET", "/users/me/dashboard");
}

export async function searchDevelopers(params: SearchDevelopersParams = {}): Promise<DeveloperSearchItem[]> {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.skills?.length) {
    searchParams.set("skills", params.skills.join(","));
  }

  if (params.experienceLevel) {
    searchParams.set("experienceLevel", params.experienceLevel);
  }

  if (params.availabilityStatus) {
    searchParams.set("availabilityStatus", params.availabilityStatus);
  }

  if (params.location?.trim()) {
    searchParams.set("location", params.location.trim());
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/users/developers/search?${queryString}` : "/users/developers/search";
  return requestJson<DeveloperSearchItem[]>("GET", path);
}

export async function getDeveloperPublicProfile(username: string): Promise<PublicDeveloperProfile> {
  return requestJson<PublicDeveloperProfile>("GET", `/users/${encodeURIComponent(username)}`);
}

export async function getProfileCompleteness(): Promise<ProfileCompleteness> {
  return requestJson<ProfileCompleteness>("GET", "/users/me/completeness");
}

export async function getAiClientMatches(payload: AiClientMatchPayload): Promise<AiClientMatchResponse> {
  return requestJson<AiClientMatchResponse, AiClientMatchPayload>("POST", "/ai/match/client-to-developers", {
    body: payload
  });
}

export async function getAiProfileImprovements(): Promise<AiProfileImprovementsResponse> {
  return requestJson<AiProfileImprovementsResponse, Record<string, never>>("POST", "/ai/match/profile-improvements", {
    body: {}
  });
}

export async function getAiProposalTemplate(payload: AiProposalTemplatePayload): Promise<AiProposalTemplateResponse> {
  return requestJson<AiProposalTemplateResponse, AiProposalTemplatePayload>("POST", "/ai/assist/proposal-template", {
    body: payload
  });
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  return requestJson<ProjectResponse, CreateProjectPayload>("POST", "/projects", { body: payload });
}

export async function publishProject(slug: string): Promise<void> {
  await requestJson<unknown, { status: "PUBLISHED" }>("PUT", `/projects/${slug}`, {
    body: { status: "PUBLISHED" }
  });
}

export async function updateProject(slug: string, payload: UpdateProjectPayload): Promise<void> {
  await requestJson<unknown, UpdateProjectPayload>("PUT", `/projects/${slug}`, {
    body: payload
  });
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.techStack?.length) {
    params.techStack.forEach((value) => searchParams.append("techStack", value));
  }
  if (params.industries?.length) {
    params.industries.forEach((value) => searchParams.append("industries", value));
  }
  if (params.pricingType) {
    searchParams.set("pricingType", params.pricingType);
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.minPrice?.trim()) {
    searchParams.set("minPrice", params.minPrice.trim());
  }
  if (params.maxPrice?.trim()) {
    searchParams.set("maxPrice", params.maxPrice.trim());
  }
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/projects?${queryString}` : "/projects";
  return requestJson<ProjectListItem[]>("GET", path);
}

export async function listProjectsPaginated(params: ListProjectsParams = {}): Promise<PaginatedProjectList> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.techStack?.length) {
    params.techStack.forEach((value) => searchParams.append("techStack", value));
  }
  if (params.industries?.length) {
    params.industries.forEach((value) => searchParams.append("industries", value));
  }
  if (params.pricingType) {
    searchParams.set("pricingType", params.pricingType);
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.minPrice?.trim()) {
    searchParams.set("minPrice", params.minPrice.trim());
  }
  if (params.maxPrice?.trim()) {
    searchParams.set("maxPrice", params.maxPrice.trim());
  }
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/projects?${queryString}` : "/projects";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: ProjectListItem[]; meta?: CursorPageMeta }
    | ProjectListItem[];

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { hasNext: false }
    };
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { hasNext: false }
  };
}

export async function getAdminRankedProjects(params: ListProjectsParams = {}): Promise<AdminPaginatedRankedProjects> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.techStack?.length) {
    params.techStack.forEach((value) => searchParams.append("techStack", value));
  }
  if (params.industries?.length) {
    params.industries.forEach((value) => searchParams.append("industries", value));
  }
  if (params.pricingType) {
    searchParams.set("pricingType", params.pricingType);
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.minPrice?.trim()) {
    searchParams.set("minPrice", params.minPrice.trim());
  }
  if (params.maxPrice?.trim()) {
    searchParams.set("maxPrice", params.maxPrice.trim());
  }
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  searchParams.set("rankingDebug", "true");

  const queryString = searchParams.toString();
  const path = queryString ? `/projects/admin/list?${queryString}` : "/projects/admin/list?rankingDebug=true";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: AdminRankedProjectListItem[]; meta?: CursorPageMeta }
    | AdminRankedProjectListItem[];

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { hasNext: false }
    };
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { hasNext: false }
  };
}

export async function getProjectBySlug(
  slug: string,
  options?: { trackView?: boolean }
): Promise<ProjectDetail> {
  const searchParams = new URLSearchParams();
  if (options?.trackView === false) {
    searchParams.set("trackView", "false");
  }

  const queryString = searchParams.toString();
  const path = queryString
    ? `/projects/${encodeURIComponent(slug)}?${queryString}`
    : `/projects/${encodeURIComponent(slug)}`;

  return requestJson<ProjectDetail>("GET", path);
}

export async function getSavedProjects(): Promise<SavedProjectEntry[]> {
  return requestJson<SavedProjectEntry[]>("GET", "/users/me/saved");
}

export async function getLikedProjects(): Promise<LikedProjectEntry[]> {
  return requestJson<LikedProjectEntry[]>("GET", "/users/me/likes");
}

export async function getMyProjects(): Promise<MyProjectListItem[]> {
  return requestJson<MyProjectListItem[]>("GET", "/users/me/projects");
}

export async function getMessageThreads(): Promise<ThreadSummary[]> {
  return requestJson<ThreadSummary[]>("GET", "/messages/threads");
}

export async function getMessageQuickReplies(threadId?: string): Promise<string[]> {
  const searchParams = new URLSearchParams();
  if (threadId) {
    searchParams.set("threadId", threadId);
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/messages/quick-replies?${queryString}` : "/messages/quick-replies";
  return requestJson<string[]>("GET", path);
}

export async function createMessageThread(payload: CreateThreadPayload): Promise<CreatedThread> {
  return requestJson<CreatedThread, CreateThreadPayload>("POST", "/messages/threads", { body: payload });
}

export async function getThreadMessages(threadId: string, cursor?: string, limit = 30): Promise<PaginatedThreadMessages> {
  const searchParams = new URLSearchParams();
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (limit) {
    searchParams.set("limit", String(limit));
  }

  const queryString = searchParams.toString();
  const path = queryString
    ? `/messages/threads/${encodeURIComponent(threadId)}?${queryString}`
    : `/messages/threads/${encodeURIComponent(threadId)}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: ThreadMessage[]; meta?: MessagePageMeta }
    | ThreadMessage[];

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { hasNext: false }
    };
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { hasNext: false }
  };
}

export async function sendThreadMessage(threadId: string, content: string): Promise<ThreadMessage> {
  return requestJson<ThreadMessage, { content: string }>("POST", `/messages/threads/${encodeURIComponent(threadId)}`, {
    body: { content }
  });
}

export async function sendThreadAttachment(threadId: string, file: File, content?: string): Promise<ThreadMessage> {
  const csrfToken = readCookie(CSRF_COOKIE_NAME);

  const send = async (): Promise<Response> => {
    const formData = new FormData();
    formData.append("file", file);
    if (content?.trim()) {
      formData.append("content", content.trim());
    }

    return fetch(`${API_BASE_URL}/messages/threads/${encodeURIComponent(threadId)}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
      },
      body: formData
    });
  };

  let response = await send();
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send();
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as ThreadMessage | ApiEnvelope<ThreadMessage>;
  if (typeof payload === "object" && payload !== null && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<ThreadMessage>).data;
  }

  return payload as ThreadMessage;
}

export async function markThreadRead(threadId: string): Promise<{ updated: number }> {
  return requestJson<{ updated: number }, Record<string, never>>("PUT", `/messages/threads/${encodeURIComponent(threadId)}/read`, {
    body: {}
  });
}

export async function trackProjectInquiry(slug: string, payload: ProjectInquiryPayload): Promise<{ tracked: true; inquiryType: string; inquiryCount: number; messageAccepted: boolean }> {
  return requestJson<{ tracked: true; inquiryType: string; inquiryCount: number; messageAccepted: boolean }, ProjectInquiryPayload>(
    "POST",
    `/projects/${encodeURIComponent(slug)}/inquiry`,
    { body: payload }
  );
}

export async function toggleProjectLike(slug: string): Promise<ProjectLikeResponse> {
  return requestJson<ProjectLikeResponse, Record<string, never>>("POST", `/projects/${encodeURIComponent(slug)}/like`, {
    body: {}
  });
}

export async function getProjectLikeStatus(slug: string): Promise<ProjectLikeResponse> {
  return requestJson<ProjectLikeResponse>("GET", `/projects/${encodeURIComponent(slug)}/like-status`);
}

export async function createHireRequest(payload: CreateHireRequestPayload): Promise<HireRequestResponse> {
  return requestJson<HireRequestResponse, CreateHireRequestPayload>("POST", "/hire-requests", {
    body: payload
  });
}

export async function listHireRequests(params: ListHireRequestsParams = {}): Promise<HireRequestResponse[]> {
  const searchParams = new URLSearchParams();
  if (params.scope) {
    searchParams.set("scope", params.scope);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/hire-requests?${queryString}` : "/hire-requests";
  return requestJson<HireRequestResponse[]>("GET", path);
}

export async function getHireRequestById(id: string): Promise<HireRequestResponse> {
  return requestJson<HireRequestResponse>("GET", `/hire-requests/${encodeURIComponent(id)}`);
}

export async function updateHireRequestStatus(
  id: string,
  status: HireRequestResponse["status"]
): Promise<HireRequestResponse> {
  return requestJson<HireRequestResponse, { status: HireRequestResponse["status"] }>(
    "PATCH",
    `/hire-requests/${encodeURIComponent(id)}/status`,
    {
      body: { status }
    }
  );
}

export async function submitHireRequestProposal(
  id: string,
  payload: SubmitHireRequestProposalPayload
): Promise<HireRequestResponse> {
  return requestJson<HireRequestResponse, SubmitHireRequestProposalPayload>(
    "PATCH",
    `/hire-requests/${encodeURIComponent(id)}/proposal`,
    {
      body: payload
    }
  );
}

export async function createMilestone(
  hireRequestId: string,
  payload: CreateMilestonePayload
): Promise<MilestoneResponse> {
  return requestJson<MilestoneResponse, CreateMilestonePayload>(
    "POST",
    `/hire-requests/${encodeURIComponent(hireRequestId)}/milestones`,
    { body: payload }
  );
}

export async function listMilestonesForHireRequest(hireRequestId: string): Promise<MilestoneResponse[]> {
  return requestJson<MilestoneResponse[]>("GET", `/hire-requests/${encodeURIComponent(hireRequestId)}/milestones`);
}

export async function getMilestoneById(id: string): Promise<MilestoneResponse> {
  return requestJson<MilestoneResponse>("GET", `/milestones/${encodeURIComponent(id)}`);
}

export async function listMilestoneEvents(id: string): Promise<MilestoneEventResponse[]> {
  return requestJson<MilestoneEventResponse[]>("GET", `/milestones/${encodeURIComponent(id)}/events`);
}

export async function fundMilestone(
  id: string,
  payload: FundMilestonePayload,
  idempotencyKey: string
): Promise<FundMilestoneResponse> {
  return requestJson<FundMilestoneResponse, FundMilestonePayload>("POST", `/milestones/${encodeURIComponent(id)}/fund`, {
    body: payload,
    headers: { "x-idempotency-key": idempotencyKey }
  });
}

export async function submitMilestone(id: string, payload: SubmitMilestonePayload): Promise<MilestoneResponse> {
  return requestJson<MilestoneResponse, SubmitMilestonePayload>("POST", `/milestones/${encodeURIComponent(id)}/submit`, {
    body: payload
  });
}

export async function releaseMilestone(
  id: string,
  payload: ReleaseMilestonePayload,
  idempotencyKey: string
): Promise<ReleaseMilestoneResponse> {
  return requestJson<ReleaseMilestoneResponse, ReleaseMilestonePayload>(
    "POST",
    `/milestones/${encodeURIComponent(id)}/release`,
    {
      body: payload,
      headers: { "x-idempotency-key": idempotencyKey }
    }
  );
}

export async function disputeMilestone(id: string, payload: CreateDisputePayload): Promise<DisputeSummary> {
  return requestJson<DisputeSummary, CreateDisputePayload>("POST", `/milestones/${encodeURIComponent(id)}/dispute`, {
    body: payload
  });
}

export async function getPayoutAccountStatus(developerId: string): Promise<PayoutAccountStatus> {
  return requestJson<PayoutAccountStatus>("GET", `/developers/${encodeURIComponent(developerId)}/payout-account/status`);
}

export async function resolveDispute(
  disputeId: string,
  payload: ResolveDisputePayload,
  idempotencyKey: string
): Promise<{ disputeId: string; status: string; milestoneId: string; milestoneStatus: MilestoneStatus }> {
  return requestJson<
    { disputeId: string; status: string; milestoneId: string; milestoneStatus: MilestoneStatus },
    ResolveDisputePayload
  >("POST", `/admin/disputes/${encodeURIComponent(disputeId)}/resolve`, {
    body: payload,
    headers: { "x-idempotency-key": idempotencyKey }
  });
}

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  return requestJson<NotificationItem[]>("GET", `/notifications?limit=${limit}`);
}

export async function getUnreadNotificationsCount(): Promise<UnreadNotificationsCount> {
  return requestJson<UnreadNotificationsCount>("GET", "/notifications/unread-count");
}

export async function readAllNotifications(): Promise<{ updated: number }> {
  return requestJson<{ updated: number }, Record<string, never>>("PUT", "/notifications/read-all", {
    body: {}
  });
}

export async function readNotification(id: string): Promise<{ updated: number }> {
  return requestJson<{ updated: number }, Record<string, never>>("PUT", `/notifications/${encodeURIComponent(id)}/read`, {
    body: {}
  });
}

export async function getAdminUsersOverview(): Promise<AdminUsersOverview> {
  return requestJson<AdminUsersOverview>("GET", "/admin/users");
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail>("GET", `/admin/users/${encodeURIComponent(userId)}`);
}

export async function setAdminUserAccess(userId: string, disabled: boolean): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail, { disabled: boolean }>("PATCH", `/admin/users/${encodeURIComponent(userId)}/access`, {
    body: { disabled }
  });
}

export async function setAdminUserPassword(userId: string, newPassword: string): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail, { newPassword: string }>("PATCH", `/admin/users/${encodeURIComponent(userId)}/password`, {
    body: { newPassword }
  });
}

export async function setAdminUserRole(userId: string, role: "DEVELOPER" | "CLIENT"): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail, { role: "DEVELOPER" | "CLIENT" }>("PATCH", `/admin/users/${encodeURIComponent(userId)}/role`, {
    body: { role }
  });
}

export async function setAdminUserVerification(userId: string, isVerified: boolean): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail, { isVerified: boolean }>("PATCH", `/admin/users/${encodeURIComponent(userId)}/verification`, {
    body: { isVerified }
  });
}

export async function deleteAdminUser(userId: string): Promise<AdminDeleteUserResponse> {
  return requestJson<AdminDeleteUserResponse>("DELETE", `/admin/users/${encodeURIComponent(userId)}`);
}

export async function getAdminPerformanceSummary(): Promise<AdminPerformanceSummary> {
  return requestJson<AdminPerformanceSummary>("GET", "/admin/performance/summary");
}

export async function getAdminPerformanceRoutes(): Promise<AdminPerformanceRouteMetric[]> {
  return requestJson<AdminPerformanceRouteMetric[]>("GET", "/admin/performance/routes");
}

export async function uploadMediaFile(file: File, options?: UploadMediaOptions): Promise<{ url: string; publicId: string }> {
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  const formData = new FormData();
  formData.append("file", file);

  if (options?.projectId) {
    formData.append("projectId", options.projectId);
  }
  if (options?.mediaType) {
    formData.append("mediaType", options.mediaType);
  }
  if (options?.caption) {
    formData.append("caption", options.caption);
  }

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { url: string; publicId: string } | ApiEnvelope<{ url: string; publicId: string }>;

  if (typeof payload === "object" && payload !== null && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<{ url: string; publicId: string }>).data;
  }

  return payload as { url: string; publicId: string };
}
