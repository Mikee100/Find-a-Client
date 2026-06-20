import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { buildPagination } from "src/common/utils/pagination.util";
import { PROJECT_STATUS } from "src/common/constants/domain-enums.constant";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { CacheService } from "src/common/cache/cache.service";
import { sanitizeInput, sanitizeRichText } from "src/common/utils/sanitize.util";
import { toSlug } from "src/common/utils/slug.util";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateProjectDto } from "src/modules/projects/dto/create-project.dto";
import { CreateProjectInquiryDto } from "src/modules/projects/dto/create-project-inquiry.dto";
import { ListProjectsDto } from "src/modules/projects/dto/list-projects.dto";
import { UpdateProjectDto } from "src/modules/projects/dto/update-project.dto";

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  private async invalidateProjectCaches() {
    await Promise.all([
      this.cacheService.invalidateNamespace("projects-list"),
      this.cacheService.invalidateNamespace("projects-search"),
      this.cacheService.invalidateNamespace("developers-search")
    ]);
  }

  private async invalidateDeveloperDashboardCache(userId: string) {
    await this.cacheService.invalidateNamespace(`developer-dashboard:${userId}`);
  }

  private normalizeStringList(values: string[]): string[] {
    return [...new Set(values.map((value) => sanitizeInput(value).trim()).filter(Boolean))];
  }

  private buildCaseVariants(values: string[]): string[] {
    const variants = new Set<string>();

    for (const raw of values) {
      const value = raw.trim();
      if (!value) {
        continue;
      }

      variants.add(value);
      variants.add(value.toLowerCase());
      variants.add(value.toUpperCase());
      variants.add(value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
    }

    return [...variants];
  }

  private computeQualityScore(likeCount: number, viewCount: number, inquiryCount: number, averageRating: number): number {
    const engagementScore = Math.min(100, likeCount * 4 + inquiryCount * 8 + Math.floor(viewCount / 25));
    const ratingScore = Math.max(0, Math.min(100, averageRating * 20));
    const blended = engagementScore * 0.7 + ratingScore * 0.3;
    return Math.round(blended * 10) / 10;
  }

  /**
   * Creates a new project for the authenticated developer.
   */
  async create(authorId: string, role: UserRole, dto: CreateProjectDto) {
    if (role !== USER_ROLE.DEVELOPER) {
      throw new ForbiddenException("Only developers can create projects");
    }

    const techStack = this.normalizeStringList(dto.techStack);
    const industries = this.normalizeStringList(dto.industries);
    const screenshots = this.normalizeStringList(dto.screenshots ?? []);

    const slug = toSlug(`${dto.title}-${Date.now()}`);
    const created = await this.prisma.project.create({
      data: {
        slug,
        title: sanitizeInput(dto.title),
        shortDescription: sanitizeInput(dto.shortDescription),
        longDescription: sanitizeRichText(dto.longDescription),
        roleInProject: dto.roleInProject ? sanitizeInput(dto.roleInProject) : undefined,
        repositoryUrl: dto.repositoryUrl,
        category: dto.category,
        status: PROJECT_STATUS.DRAFT,
        techStack,
        industries,
        pricingType: dto.pricingType,
        price: dto.price,
        currency: dto.currency ?? "USD",
        authorId,
        demoUrl: dto.demoUrl,
        backgroundUrl: dto.backgroundUrl,
        thumbnailUrl: dto.thumbnailUrl,
        videoUrl: dto.videoUrl,
        media: screenshots.length
          ? {
              create: screenshots.map((url, index) => ({
                type: "SCREENSHOT",
                url,
                order: index
              }))
            }
          : undefined
      }
    });

    await this.invalidateProjectCaches();
    await this.invalidateDeveloperDashboardCache(authorId);
    return created;
  }

  /**
   * Lists projects with filter and cursor pagination.
   */
  async list(query: ListProjectsDto) {
    const startedAt = Date.now();
    const cacheKey = await this.cacheService.composeKey("projects-list", JSON.stringify(query));
    const cached = await this.cacheService.get<{
      success: true;
      data: unknown[];
      meta: Record<string, unknown>;
    }>(cacheKey);

    if (cached) {
      this.logger.debug(
        JSON.stringify({
          event: "projects_list",
          source: "cache",
          durationMs: Date.now() - startedAt,
          query
        })
      );
      return cached;
    }

    const requestedLimit = Number(query.limit ?? 20);
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 20;
    const requestedPage = query.page ? Number(query.page) : null;
    const page = requestedPage !== null && Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : null;
    const searchText = query.search?.trim();
    const searchTerms = searchText
      ? [
          ...new Set(
            searchText
              .split(/\s+/)
              .map((part) => part.replace(/^[^\w]+|[^\w]+$/g, "").trim())
              .filter(Boolean)
          )
        ]
      : [];
    const searchTermVariants = this.buildCaseVariants(searchTerms);
    const techStackFilterVariants = this.buildCaseVariants(query.techStack ?? []);
    const industryFilterVariants = this.buildCaseVariants(query.industries ?? []);

    const tokenSearchClauses: Prisma.ProjectWhereInput[] = searchTerms.map((term) => {
      const tokenVariants = this.buildCaseVariants([term]);

      return {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { shortDescription: { contains: term, mode: "insensitive" } },
          { longDescription: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
          {
            author: {
              OR: [
                { fullName: { contains: term, mode: "insensitive" } },
                { username: { contains: term, mode: "insensitive" } }
              ]
            }
          },
          { techStack: { hasSome: tokenVariants } },
          { industries: { hasSome: tokenVariants } }
        ]
      };
    });

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      status: PROJECT_STATUS.PUBLISHED,
      category: query.category,
      pricingType: query.pricingType,
      techStack: techStackFilterVariants.length ? { hasSome: techStackFilterVariants } : undefined,
      industries: industryFilterVariants.length ? { hasSome: industryFilterVariants } : undefined,
      AND: searchText
        ? [
            {
              OR: [
                { title: { contains: searchText, mode: "insensitive" } },
                { shortDescription: { contains: searchText, mode: "insensitive" } },
                { longDescription: { contains: searchText, mode: "insensitive" } },
                { slug: { contains: searchText, mode: "insensitive" } },
                {
                  author: {
                    OR: [
                      { fullName: { contains: searchText, mode: "insensitive" } },
                      { username: { contains: searchText, mode: "insensitive" } }
                    ]
                  }
                },
                ...(searchTermVariants.length > 0
                  ? [
                      { techStack: { hasSome: searchTermVariants } },
                      { industries: { hasSome: searchTermVariants } }
                    ]
                  : [])
              ]
            },
            ...tokenSearchClauses
          ]
        : undefined,
      price: {
        gte: query.minPrice ? Number(query.minPrice) : undefined,
        lte: query.maxPrice ? Number(query.maxPrice) : undefined
      }
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      query.sortBy === "popular"
        ? { likeCount: "desc" }
        : query.sortBy === "most_viewed"
          ? { viewCount: "desc" }
          : query.sortBy === "oldest"
            ? { createdAt: "asc" }
        : query.sortBy === "price_asc"
          ? { price: "asc" }
          : query.sortBy === "price_desc"
            ? { price: "desc" }
            : { createdAt: "desc" };

    if (page !== null) {
      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.project.findMany({
          where,
          orderBy,
          take: limit,
          skip: (page - 1) * limit
        }),
        this.prisma.project.count({ where })
      ]);

      const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
      const hasNext = page < totalPages;

      const payload = {
        success: true,
        data: items,
        meta: {
          hasNext,
          nextCursor: hasNext ? items[items.length - 1]?.id : undefined,
          page,
          totalPages,
          totalItems
        }
      };

      await this.cacheService.set(cacheKey, payload, 60);
      this.logger.debug(
        JSON.stringify({
          event: "projects_list",
          source: "database",
          mode: "page",
          durationMs: Date.now() - startedAt,
          requestedLimit,
          appliedLimit: limit,
          page,
          resultCount: items.length,
          totalItems
        })
      );
      return payload;
    }

    const items = await this.prisma.project.findMany({
      where,
      orderBy,
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0
    });

    const { data, meta } = buildPagination(items, limit);
    const payload = {
      success: true,
      data,
      meta
    };

    await this.cacheService.set(cacheKey, payload, 60);
    this.logger.debug(
      JSON.stringify({
        event: "projects_list",
        source: "database",
        mode: "cursor",
        durationMs: Date.now() - startedAt,
        requestedLimit,
        appliedLimit: limit,
        cursor: query.cursor ?? null,
        resultCount: data.length,
        hasNext: meta.hasNext
      })
    );
    return payload;
  }

  /**
   * Gets project details by slug and increments view count.
   */
  async getBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug }, include: { author: true, media: true } });
    if (!project || project.deletedAt) {
      throw new NotFoundException("Project not found");
    }

    const nextViewCount = project.viewCount + 1;
    const qualityScore = this.computeQualityScore(project.likeCount, nextViewCount, project.inquiryCount, project.averageRating);
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        viewCount: { increment: 1 },
        qualityScore
      }
    });

    return {
      ...project,
      viewCount: nextViewCount,
      qualityScore
    };
  }

  /**
   * Updates project owned by current user.
   */
  async update(slug: string, userId: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException("Project not found");
    }
    if (existing.authorId !== userId) {
      throw new ForbiddenException("Not project owner");
    }

    const { screenshots, ...rest } = dto;
    const clearProjectVideo = Object.prototype.hasOwnProperty.call(dto, "videoUrl") && dto.videoUrl === null;

    const data: Prisma.ProjectUpdateInput = {
      ...rest,
      title: rest.title !== undefined ? sanitizeInput(rest.title) : undefined,
      shortDescription: rest.shortDescription !== undefined ? sanitizeInput(rest.shortDescription) : undefined,
      longDescription: rest.longDescription !== undefined ? sanitizeRichText(rest.longDescription) : undefined,
      roleInProject: rest.roleInProject !== undefined ? sanitizeInput(rest.roleInProject) : undefined,
      techStack: rest.techStack ? this.normalizeStringList(rest.techStack) : undefined,
      industries: rest.industries ? this.normalizeStringList(rest.industries) : undefined
    };

    const normalizedScreenshots = screenshots ? this.normalizeStringList(screenshots) : undefined;

    const updatedProject = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({ where: { id: existing.id }, data });

      if (normalizedScreenshots !== undefined) {
        await tx.projectMedia.deleteMany({
          where: {
            projectId: existing.id,
            type: "SCREENSHOT"
          }
        });

        if (normalizedScreenshots.length > 0) {
          await tx.projectMedia.createMany({
            data: normalizedScreenshots.map((url, index) => ({
              projectId: existing.id,
              type: "SCREENSHOT",
              url,
              order: index
            }))
          });
        }
      }

      if (clearProjectVideo) {
        await tx.projectMedia.deleteMany({
          where: {
            projectId: existing.id,
            type: "VIDEO"
          }
        });
      }

      return updated;
    });

    await this.invalidateProjectCaches();
    await this.invalidateDeveloperDashboardCache(userId);
    return updatedProject;
  }

  /**
   * Archives project as soft delete.
   */
  async archive(slug: string, userId: string): Promise<{ archived: true }> {
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (!existing) {
      throw new NotFoundException("Project not found");
    }
    if (existing.authorId !== userId) {
      throw new ForbiddenException("Not project owner");
    }
    await this.prisma.softDeleteProject(existing.id);
    await this.invalidateProjectCaches();
    await this.invalidateDeveloperDashboardCache(userId);
    return { archived: true };
  }

  /**
   * Toggles like for current user and adjusts project counter.
   */
  async toggleLike(slug: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true, authorId: true, likeCount: true, viewCount: true, inquiryCount: true, averageRating: true }
      });

      if (!project) {
        throw new NotFoundException("Project not found");
      }

      if (project.authorId === userId) {
        throw new ForbiddenException("You cannot like your own project");
      }

      const existingLike = await tx.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId"
        FROM "ProjectLike"
        WHERE "userId" = ${userId}::uuid
          AND "projectId" = ${project.id}::uuid
        LIMIT 1
      `;

      if (existingLike.length > 0) {
        await tx.$executeRaw`
          DELETE FROM "ProjectLike"
          WHERE "userId" = ${userId}::uuid
            AND "projectId" = ${project.id}::uuid
        `;

        const updated = await tx.project.update({
          where: { id: project.id },
          data: {
            likeCount: project.likeCount > 0 ? { decrement: 1 } : undefined,
            qualityScore: this.computeQualityScore(
              Math.max(0, project.likeCount - 1),
              project.viewCount,
              project.inquiryCount,
              project.averageRating
            )
          },
          select: { likeCount: true }
        });

        return {
          liked: false,
          likeCount: Math.max(0, updated.likeCount)
        };
      }

      await tx.$executeRaw`
        INSERT INTO "ProjectLike" ("userId", "projectId", "createdAt")
        VALUES (${userId}::uuid, ${project.id}::uuid, NOW())
        ON CONFLICT ("userId", "projectId") DO NOTHING
      `;

      const updated = await tx.project.update({
        where: { id: project.id },
        data: {
          likeCount: { increment: 1 },
          qualityScore: this.computeQualityScore(
            project.likeCount + 1,
            project.viewCount,
            project.inquiryCount,
            project.averageRating
          )
        },
        select: { likeCount: true }
      });

      return {
        liked: true,
        likeCount: updated.likeCount
      };
    });

    await this.invalidateProjectCaches();
    const likedProject = await this.prisma.project.findUnique({
      where: { slug },
      select: { authorId: true }
    });
    if (likedProject?.authorId) {
      await this.invalidateDeveloperDashboardCache(likedProject.authorId);
    }
    return result;
  }

  async getLikeStatus(slug: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true, likeCount: true }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const like = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId"
      FROM "ProjectLike"
      WHERE "userId" = ${userId}::uuid
        AND "projectId" = ${project.id}::uuid
      LIMIT 1
    `;

    return {
      liked: like.length > 0,
      likeCount: project.likeCount
    };
  }

  /**
   * Toggles bookmark for current user.
   */
  async toggleSave(slug: string, userId: string): Promise<{ saved: boolean }> {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    const existing = await this.prisma.saved.findUnique({ where: { userId_projectId: { userId, projectId: project.id } } });
    if (existing) {
      await this.prisma.saved.delete({ where: { userId_projectId: { userId, projectId: project.id } } });
      await this.invalidateDeveloperDashboardCache(userId);
      return { saved: false };
    }
    await this.prisma.saved.create({ data: { userId, projectId: project.id } });
    await this.invalidateDeveloperDashboardCache(userId);
    return { saved: true };
  }

  /**
   * Tracks inquiry intent from a potential client and increments inquiry counter.
   */
  async trackInquiry(slug: string, userId: string, dto: CreateProjectInquiryDto) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true, authorId: true, inquiryCount: true, likeCount: true, viewCount: true, averageRating: true }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.authorId === userId) {
      throw new ForbiddenException("You cannot create an inquiry on your own project");
    }

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        inquiryCount: { increment: 1 },
        qualityScore: this.computeQualityScore(
          project.likeCount,
          project.viewCount,
          project.inquiryCount + 1,
          project.averageRating
        )
      },
      select: { inquiryCount: true }
    });

    await this.invalidateDeveloperDashboardCache(project.authorId);

    return {
      tracked: true,
      inquiryType: dto.type ?? "ASK_QUESTION",
      inquiryCount: updated.inquiryCount,
      messageAccepted: Boolean(dto.message?.trim())
    };
  }
}
