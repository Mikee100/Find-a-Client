import { Injectable } from "@nestjs/common";
import { Prisma, ProjectStatus } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

interface SearchQuery {
  q?: string;
  category?: string;
  tech?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs project search with category and tech filters.
   */
  async search(query: SearchQuery) {
    const where: Prisma.ProjectWhereInput = {
      status: ProjectStatus.PUBLISHED,
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

    return projects.map((project) => ({
      ...project,
      headline: `${project.title} - ${project.shortDescription}`
    }));
  }
}
