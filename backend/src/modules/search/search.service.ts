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
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 50
    });

    const payload = projects.map((project) => ({
      ...project,
      headline: `${project.title} - ${project.shortDescription}`
    }));

    await this.cacheService.set(cacheKey, payload, 60);
    return payload;
  }
}
