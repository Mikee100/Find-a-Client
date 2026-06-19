import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SearchDevelopersDto } from "src/modules/users/dto/search-developers.dto";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
        linkedinUrl: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
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
            createdAt: true
          }
        }
      }
    });

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
        const projectEngagement = Math.min(100, totalLikes * 2 + Math.floor(totalViews / 10));
        const projectCountBoost = Math.min(20, user.projects.length * 4);

        const score = Math.round(
          completeness * 0.45 +
            (normalizedSkills.length ? (skillMatches / normalizedSkills.length) * 100 : 70) * 0.35 +
            projectEngagement * 0.15 +
            projectCountBoost * 0.05
        );

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
            projectEngagement
          },
          updatedAt: user.updatedAt
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.score - a.score || b.projectCount - a.projectCount)
      .slice(0, limit);

    return ranked;
  }

  /**
   * Updates current authenticated user profile.
   */
  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto
    });
  }

  /**
   * Updates avatar URL after successful media upload.
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });
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
        category: true,
        status: true,
        techStack: true,
        likeCount: true,
        viewCount: true,
        thumbnailUrl: true,
        backgroundUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
