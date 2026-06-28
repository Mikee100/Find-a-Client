import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { CacheService } from "src/common/cache/cache.service";
import { PROJECT_STATUS } from "src/common/constants/domain-enums.constant";
import { PrismaService } from "src/prisma/prisma.service";

interface SearchQuery {
  q?: string;
  category?: string;
  tech?: string;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  private clamp(value: number, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
  }

  private decayedFreshnessScore(date: Date, halfLifeDays = 14) {
    const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return this.clamp(Math.round(100 * Math.exp(-Math.max(0, ageInDays) / halfLifeDays)));
  }

  /**
   * Performs project search with category and tech filters.
   */
  async search(query: SearchQuery) {
    const cacheKey = await this.cacheService.composeKey("projects-search", JSON.stringify(query));
    const cached = await this.cacheService.get<Array<Record<string, unknown>>>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: Prisma.ProjectWhereInput = {
      status: PROJECT_STATUS.PUBLISHED,
      deletedAt: null,
      category: query.category as Prisma.EnumProjectCategoryFilter,
      techStack: query.tech ? { has: query.tech } : undefined,
      OR: query.q
        ? [
            { title: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
            { techStack: { hasSome: [query.q] } }
          ]
        : undefined
    };

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 50
    });

    const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
    const payload = projects
      .map((project) => {
        const freshness = this.decayedFreshnessScore(project.updatedAt, 16);
        const qualityModelScore = project.qualityScore <= 1 ? project.qualityScore * 100 : project.qualityScore;
        const qualityReviewsScore = (project.averageRating / 5) * 100;
        const quality = this.clamp(Math.round(qualityReviewsScore * 0.6 + qualityModelScore * 0.4));

        const completenessChecks = [
          Boolean(project.title.trim()),
          Boolean(project.shortDescription.trim()),
          Boolean(project.longDescription.trim()),
          project.techStack.length > 0,
          project.industries.length > 0,
          Boolean(project.thumbnailUrl),
          Boolean(project.backgroundUrl),
          Boolean(project.demoUrl || project.videoUrl)
        ];
        const completeness = Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100);

        const engagement = this.clamp(
          Math.round(project.inquiryCount * 9 + project.likeCount * 3.5 + project.viewCount / 25)
        );

        const daysSinceCreated = Math.max(0, (Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const recencyBoost = this.clamp(Math.round(30 - daysSinceCreated), 0, 30);
        const activity = this.clamp(Math.round(engagement * 0.8 + recencyBoost));

        const relevance = normalizedQuery
          ? this.clamp(
              Math.round(
                (project.title.toLowerCase().includes(normalizedQuery) ? 45 : 0) +
                  (project.shortDescription.toLowerCase().includes(normalizedQuery) ? 25 : 0) +
                  (project.techStack.some((item) => item.toLowerCase().includes(normalizedQuery)) ? 30 : 0)
              )
            )
          : 70;

        const weightedSignals =
          freshness * 0.25 + quality * 0.3 + completeness * 0.15 + activity * 0.2 + relevance * 0.1;
        const featuredBoost = project.isFeatured ? 8 : 0;
        const score = Math.round(this.clamp(weightedSignals + featuredBoost));

        return {
          ...project,
          headline: `${project.title} - ${project.shortDescription}`,
          score,
          scoreBreakdown: {
            freshness,
            quality,
            completeness,
            activity,
            relevance,
            featuredBoost,
            weightedSignals: Math.round(weightedSignals)
          }
        };
      })
      .sort((a, b) => b.score - a.score || b.likeCount - a.likeCount || b.createdAt.getTime() - a.createdAt.getTime());

    await this.cacheService.set(cacheKey, payload, 60);
    return payload;
  }
}
