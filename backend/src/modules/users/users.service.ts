import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "src/common/cache/cache.service";
import { HIRE_REQUEST_STATUS } from "src/common/constants/domain-enums.constant";
import { PrismaService } from "src/prisma/prisma.service";
import { SearchDevelopersDto } from "src/modules/users/dto/search-developers.dto";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  private async invalidateDiscoveryCaches() {
    await Promise.all([
      this.cacheService.invalidateNamespace("developers-search"),
      this.cacheService.invalidateNamespace("projects-list"),
      this.cacheService.invalidateNamespace("projects-search")
    ]);
  }

  private async invalidateDeveloperDashboardCache(userId: string) {
    await this.cacheService.invalidateNamespace(`developer-dashboard:${userId}`);
  }

  private clamp(value: number, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
  }

  private decayedFreshnessScore(date: Date, halfLifeDays = 21) {
    const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return this.clamp(Math.round(100 * Math.exp(-Math.max(0, ageInDays) / halfLifeDays)));
  }

  async getProfileCompleteness(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        title: true,
        bio: true,
        avatarUrl: true,
        skills: true,
        primaryStack: true,
        experienceLevel: true,
        availabilityStatus: true,
        location: true,
        websiteUrl: true,
        githubUrl: true,
        linkedinUrl: true,
        contactEmail: true,
        publicEmailEnabled: true,
        educationEntries: true,
        certificationEntries: true,
        languageEntries: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const projectCount = await this.prisma.project.count({
      where: {
        authorId: userId,
        deletedAt: null
      }
    });

    const checks: Array<{ key: string; complete: boolean; message: string }> = [
      { key: "fullName", complete: Boolean(user.fullName?.trim()), message: "Add your full name" },
      { key: "title", complete: Boolean(user.title?.trim()), message: "Add a professional title" },
      { key: "bio", complete: Boolean(user.bio?.trim()), message: "Add a bio" },
      { key: "avatar", complete: Boolean(user.avatarUrl), message: "Add a profile photo" },
      { key: "skills", complete: (user.skills?.length ?? 0) > 0, message: "Add at least one skill" },
      { key: "primaryStack", complete: Boolean(user.primaryStack?.trim()), message: "Add your primary stack" },
      {
        key: "experienceLevel",
        complete: Boolean(user.experienceLevel),
        message: "Select your experience level"
      },
      {
        key: "availabilityStatus",
        complete: Boolean(user.availabilityStatus),
        message: "Set your availability status"
      },
      { key: "location", complete: Boolean(user.location?.trim()), message: "Add your location" },
      { key: "website", complete: Boolean(user.websiteUrl?.trim()), message: "Add your portfolio website" },
      { key: "github", complete: Boolean(user.githubUrl?.trim()), message: "Add your GitHub link" },
      { key: "linkedin", complete: Boolean(user.linkedinUrl?.trim()), message: "Add your LinkedIn link" },
      {
        key: "educationEntries",
        complete: (user.educationEntries?.length ?? 0) > 0,
        message: "Add your education details"
      },
      {
        key: "certificationEntries",
        complete: (user.certificationEntries?.length ?? 0) > 0,
        message: "Add your certifications"
      },
      {
        key: "languageEntries",
        complete: (user.languageEntries?.length ?? 0) > 0,
        message: "Add your spoken languages"
      },
      {
        key: "publicContactEmail",
        complete: !user.publicEmailEnabled || Boolean(user.contactEmail?.trim()),
        message: "Add a contact email or turn off public email"
      },
      { key: "projects", complete: projectCount > 0, message: "Publish your first project" }
    ];

    const totalFields = checks.length;
    const completedFields = checks.filter((item) => item.complete).length;
    const percentage = Math.round((completedFields / totalFields) * 100);
    const missingFields = checks.filter((item) => !item.complete).map((item) => item.message);

    return {
      percentage,
      completedFields,
      totalFields,
      missingFields,
      nextAction: missingFields[0] ?? null
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        title: true,
        role: true,
        bio: true,
        skills: true,
        primaryStack: true,
        experienceLevel: true,
        availabilityStatus: true,
        location: true,
        contactEmail: true,
        publicEmailEnabled: true,
        educationEntries: true,
        certificationEntries: true,
        languageEntries: true,
        phoneNumber: true,
        websiteUrl: true,
        githubUrl: true,
        githubUsername: true,
        githubVerifiedAt: true,
        linkedinUrl: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async getDeveloperDashboard(userId: string) {
    const cacheKey = await this.cacheService.composeKey(`developer-dashboard:${userId}`, "summary");
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const [profile, savedProjects, myProjects, completeness, recommendedProjects, notifications, threads] =
      await Promise.all([
        this.getMe(userId),
        this.getSavedProjects(userId),
        this.getMyProjects(userId),
        this.getProfileCompleteness(userId),
        this.prisma.project.findMany({
          where: {
            status: "PUBLISHED",
            deletedAt: null
          },
          orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
          take: 8,
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            roleInProject: true,
            repositoryUrl: true,
            category: true,
            techStack: true,
            pricingType: true,
            price: true,
            currency: true,
            thumbnailUrl: true,
            backgroundUrl: true,
            likeCount: true,
            viewCount: true,
            inquiryCount: true,
            qualityScore: true,
            createdAt: true
          }
        }),
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
          take: 20
        }),
        this.prisma.thread.findMany({
          where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
          include: {
            participantA: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true
              }
            },
            participantB: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true
              }
            },
            project: {
              select: {
                id: true,
                slug: true,
                title: true
              }
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { updatedAt: "desc" }
        })
      ]);

    const threadIds = threads.map((thread) => thread.id);
    const unreadByThread =
      threadIds.length > 0
        ? await this.prisma.message.groupBy({
            by: ["threadId"],
            where: {
              threadId: { in: threadIds },
              isRead: false,
              senderId: { not: userId }
            },
            _count: {
              threadId: true
            }
          })
        : [];

    const unreadCountByThreadId = new Map<string, number>(
      unreadByThread.map((row) => [row.threadId, row._count.threadId])
    );

    const consolidated = new Map<string, { thread: (typeof threads)[number]; unreadCount: number }>();
    for (const thread of threads) {
      const unreadCount = unreadCountByThreadId.get(thread.id) ?? 0;
      const partnerId = thread.participantAId === userId ? thread.participantBId : thread.participantAId;
      const current = consolidated.get(partnerId);
      const itemTimestamp = new Date(thread.messages[0]?.createdAt ?? thread.updatedAt).getTime();

      if (!current) {
        consolidated.set(partnerId, { thread, unreadCount });
        continue;
      }

      const currentTimestamp = new Date(current.thread.messages[0]?.createdAt ?? current.thread.updatedAt).getTime();
      const nextUnread = current.unreadCount + unreadCount;

      if (itemTimestamp > currentTimestamp) {
        consolidated.set(partnerId, { thread, unreadCount: nextUnread });
      } else {
        consolidated.set(partnerId, { thread: current.thread, unreadCount: nextUnread });
      }
    }

    const dashboardThreads = [...consolidated.values()]
      .map(({ thread, unreadCount }) => ({ ...thread, unreadCount }))
      .sort((left, right) => {
        const leftTs = new Date(left.messages[0]?.createdAt ?? left.updatedAt).getTime();
        const rightTs = new Date(right.messages[0]?.createdAt ?? right.updatedAt).getTime();
        return rightTs - leftTs;
      });

    const payload = {
      profile,
      threads: dashboardThreads,
      notifications,
      savedProjects,
      myProjects,
      completeness,
      recommendedProjects
    };

    await this.cacheService.set(cacheKey, payload, 10);
    return payload;
  }

  /**
   * Returns public profile with published projects.
   */
  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        title: true,
        bio: true,
        skills: true,
        primaryStack: true,
        experienceLevel: true,
        availabilityStatus: true,
        location: true,
        websiteUrl: true,
        githubUrl: true,
        linkedinUrl: true,
        publicEmailEnabled: true,
        contactEmail: true,
        projects: {
          where: { status: "PUBLISHED", deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            techStack: true,
            likeCount: true,
            viewCount: true,
            inquiryCount: true,
            thumbnailUrl: true,
            backgroundUrl: true,
            demoUrl: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      contactEmail: user.publicEmailEnabled ? user.contactEmail : null
    };
  }

  async searchDevelopers(query: SearchDevelopersDto) {
    const cacheKey = await this.cacheService.composeKey("developers-search", JSON.stringify(query));
    const cached = await this.cacheService.get<Array<Record<string, unknown>>>(cacheKey);

    if (cached) {
      return cached;
    }

    const limit = query.limit ?? 24;
    const normalizedSkills = (query.skills ?? []).map((skill) => skill.toLowerCase());
    const normalizedQuery = query.q?.trim().toLowerCase() ?? "";

    const users = await this.prisma.user.findMany({
      where: {
        role: "DEVELOPER",
        experienceLevel: query.experienceLevel,
        availabilityStatus: query.availabilityStatus,
        location: query.location
          ? {
              contains: query.location,
              mode: "insensitive"
            }
          : undefined
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        title: true,
        bio: true,
        skills: true,
        primaryStack: true,
        experienceLevel: true,
        availabilityStatus: true,
        location: true,
        websiteUrl: true,
        githubUrl: true,
        linkedinUrl: true,
        updatedAt: true,
        projects: {
          where: {
            status: "PUBLISHED",
            deletedAt: null
          },
          select: {
            id: true,
            likeCount: true,
            viewCount: true,
            inquiryCount: true,
            averageRating: true,
            createdAt: true,
            updatedAt: true
          }
        },
        receivedHireRequests: {
          select: {
            status: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    const respondedStatuses = new Set<string>([
      HIRE_REQUEST_STATUS.REVIEWING,
      HIRE_REQUEST_STATUS.PROPOSAL_SENT,
      HIRE_REQUEST_STATUS.NEGOTIATING,
      HIRE_REQUEST_STATUS.ACCEPTED,
      HIRE_REQUEST_STATUS.REJECTED
    ]);
    const recentActivityWindowMs = 1000 * 60 * 60 * 24 * 30;
    const recentProjectWindowMs = 1000 * 60 * 60 * 24 * 45;

    const ranked = users
      .map((user) => {
        const profileChecks = [
          Boolean(user.fullName?.trim()),
          Boolean(user.title?.trim()),
          Boolean(user.bio?.trim()),
          Boolean(user.avatarUrl),
          (user.skills?.length ?? 0) > 0,
          Boolean(user.primaryStack?.trim()),
          Boolean(user.location?.trim()),
          Boolean(user.githubUrl?.trim()),
          Boolean(user.linkedinUrl?.trim()),
          Boolean(user.websiteUrl?.trim()),
          user.projects.length > 0
        ];

        const completeness = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
        const skillPool = [...user.skills, user.primaryStack ?? ""].map((value) => value.toLowerCase());
        const skillMatches = normalizedSkills.length
          ? normalizedSkills.filter((skill) => skillPool.some((candidate) => candidate.includes(skill))).length
          : 0;

        const queryMatch = normalizedQuery
          ? [
              user.fullName,
              user.title,
              user.bio,
              user.primaryStack,
              ...user.skills
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedQuery))
          : true;

        const totalLikes = user.projects.reduce((sum, project) => sum + project.likeCount, 0);
        const totalViews = user.projects.reduce((sum, project) => sum + project.viewCount, 0);
        const totalInquiries = user.projects.reduce((sum, project) => sum + project.inquiryCount, 0);
        const reviewableProjects = user.projects.filter((project) => project.averageRating > 0);
        const weightedRating = reviewableProjects.length
          ? reviewableProjects.reduce((sum, project) => {
              const weight = 1 + project.inquiryCount * 0.5 + project.likeCount * 0.25;
              return sum + project.averageRating * weight;
            }, 0) /
            reviewableProjects.reduce((sum, project) => sum + (1 + project.inquiryCount * 0.5 + project.likeCount * 0.25), 0)
          : 0;

        const responseTotal = user.receivedHireRequests.length;
        const responses = user.receivedHireRequests.filter((item) => respondedStatuses.has(item.status)).length;
        const bayesianResponseRate = (responses + 3) / (responseTotal + 5);
        const responseRateScore = this.clamp(Math.round(bayesianResponseRate * 100));

        const freshnessSource = user.projects.length
          ? user.projects.reduce((latest, project) =>
              project.updatedAt.getTime() > latest.getTime() ? project.updatedAt : latest
            , user.updatedAt)
          : user.updatedAt;
        const freshnessScore = this.decayedFreshnessScore(freshnessSource, 24);

        const reviewConfidence = this.clamp(reviewableProjects.length / 4, 0, 1);
        const reviewQualityScore = this.clamp(
          Math.round(((weightedRating / 5) * 100) * reviewConfidence + 68 * (1 - reviewConfidence))
        );

        const now = Date.now();
        const recentProjects = user.projects.filter((project) => now - project.updatedAt.getTime() <= recentProjectWindowMs).length;
        const recentResponses = user.receivedHireRequests.filter(
          (item) => respondedStatuses.has(item.status) && now - item.updatedAt.getTime() <= recentActivityWindowMs
        ).length;

        const activityScore = this.clamp(
          Math.round(
            recentProjects * 18 +
              recentResponses * 15 +
              Math.min(25, totalInquiries * 4) +
              Math.min(18, totalLikes * 1.5) +
              Math.min(14, totalViews / 30)
          )
        );

        const relevanceScore = normalizedSkills.length ? (skillMatches / normalizedSkills.length) * 100 : 70;
        const weightedSignalsScore =
          freshnessScore * 0.15 +
          responseRateScore * 0.3 +
          reviewQualityScore * 0.25 +
          completeness * 0.15 +
          activityScore * 0.15;

        const score = Math.round(weightedSignalsScore * 0.8 + relevanceScore * 0.2);

        if (!queryMatch) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          title: user.title,
          bio: user.bio,
          skills: user.skills,
          primaryStack: user.primaryStack,
          experienceLevel: user.experienceLevel,
          availabilityStatus: user.availabilityStatus,
          location: user.location,
          websiteUrl: user.websiteUrl,
          githubUrl: user.githubUrl,
          linkedinUrl: user.linkedinUrl,
          projectCount: user.projects.length,
          profileCompleteness: completeness,
          score,
          scoreBreakdown: {
            completeness,
            skillMatches,
            requestedSkills: normalizedSkills.length,
            freshness: freshnessScore,
            responseRate: responseRateScore,
            reviewQuality: reviewQualityScore,
            activity: activityScore,
            relevance: Math.round(relevanceScore),
            weightedSignals: Math.round(weightedSignalsScore)
          },
          updatedAt: user.updatedAt
        };
      })
      .filter((item) => item !== null)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.scoreBreakdown.activity as number) - (a.scoreBreakdown.activity as number) ||
          b.projectCount - a.projectCount
      )
      .slice(0, limit);

    await this.cacheService.set(cacheKey, ranked, 120);
    return ranked;
  }

  /**
   * Updates current authenticated user profile.
   */
  async updateMe(userId: string, dto: UpdateUserDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        githubUrl: true
      }
    });

    const normalizedIncomingGithubUrl = dto.githubUrl?.trim();
    const normalizedExistingGithubUrl = currentUser?.githubUrl?.trim();
    const githubUrlChanged =
      normalizedIncomingGithubUrl !== undefined && normalizedIncomingGithubUrl !== normalizedExistingGithubUrl;

    const data = githubUrlChanged
      ? {
          ...dto,
          githubVerifiedAt: null,
          githubUsername: null
        }
      : dto;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data
    });

    await this.invalidateDiscoveryCaches();
    await this.invalidateDeveloperDashboardCache(userId);
    return updated;
  }

  /**
   * Updates avatar URL after successful media upload.
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    await this.invalidateDiscoveryCaches();
    await this.invalidateDeveloperDashboardCache(userId);
    return updated;
  }

  /**
   * Lists bookmarked projects for a user.
   */
  async getSavedProjects(userId: string) {
    return this.prisma.saved.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Lists projects liked by a user.
   */
  async getLikedProjects(userId: string) {
    const likedRows = await this.prisma.$queryRaw<Array<{ projectId: string; createdAt: Date }>>`
      SELECT "projectId", "createdAt"
      FROM "ProjectLike"
      WHERE "userId" = ${userId}::uuid
      ORDER BY "createdAt" DESC
    `;

    if (likedRows.length === 0) {
      return [];
    }

    const projectIds = likedRows.map((row) => row.projectId);
    const projects = await this.prisma.project.findMany({
      where: {
        id: { in: projectIds },
        deletedAt: null
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        status: true,
        category: true,
        techStack: true,
        pricingType: true,
        price: true,
        currency: true,
        likeCount: true,
        viewCount: true,
        inquiryCount: true,
        thumbnailUrl: true,
        backgroundUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const projectById = new Map(projects.map((project) => [project.id, project]));
    return likedRows
      .map((row) => {
        const project = projectById.get(row.projectId);
        if (!project) {
          return null;
        }

        return {
          projectId: row.projectId,
          createdAt: row.createdAt,
          project
        };
      })
      .filter((entry): entry is { projectId: string; createdAt: Date; project: (typeof projects)[number] } => entry !== null);
  }

  /**
   * Lists projects created by current authenticated user.
   */
  async getMyProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        authorId: userId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        roleInProject: true,
        repositoryUrl: true,
        category: true,
        status: true,
        techStack: true,
        likeCount: true,
        viewCount: true,
        qualityScore: true,
        thumbnailUrl: true,
        backgroundUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
