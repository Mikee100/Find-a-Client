import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProjectStatus, UserRole } from "@prisma/client";
import { buildPagination } from "src/common/utils/pagination.util";
import { sanitizeInput, sanitizeRichText } from "src/common/utils/sanitize.util";
import { toSlug } from "src/common/utils/slug.util";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateProjectDto } from "src/modules/projects/dto/create-project.dto";
import { ListProjectsDto } from "src/modules/projects/dto/list-projects.dto";
import { UpdateProjectDto } from "src/modules/projects/dto/update-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeStringList(values: string[]): string[] {
    return [...new Set(values.map((value) => sanitizeInput(value).trim()).filter(Boolean))];
  }

  /**
   * Creates a new project for the authenticated developer.
   */
  async create(authorId: string, role: UserRole, dto: CreateProjectDto) {
    if (role !== UserRole.DEVELOPER) {
      throw new ForbiddenException("Only developers can create projects");
    }

    const techStack = this.normalizeStringList(dto.techStack);
    const industries = this.normalizeStringList(dto.industries);

    const slug = toSlug(`${dto.title}-${Date.now()}`);
    return this.prisma.project.create({
      data: {
        slug,
        title: sanitizeInput(dto.title),
        shortDescription: sanitizeInput(dto.shortDescription),
        longDescription: sanitizeRichText(dto.longDescription),
        category: dto.category,
        status: ProjectStatus.DRAFT,
        techStack,
        industries,
        pricingType: dto.pricingType,
        price: dto.price,
        currency: dto.currency ?? "USD",
        authorId,
        demoUrl: dto.demoUrl,
        thumbnailUrl: dto.thumbnailUrl,
        videoUrl: dto.videoUrl
      }
    });
  }

  /**
   * Lists projects with filter and cursor pagination.
   */
  async list(query: ListProjectsDto) {
    const limit = Number(query.limit ?? 20);
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      status: ProjectStatus.PUBLISHED,
      category: query.category,
      pricingType: query.pricingType,
      techStack: query.techStack?.length ? { hasSome: query.techStack } : undefined,
      industries: query.industries?.length ? { hasSome: query.industries } : undefined,
      title: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
      price: {
        gte: query.minPrice ? Number(query.minPrice) : undefined,
        lte: query.maxPrice ? Number(query.maxPrice) : undefined
      }
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      query.sortBy === "popular"
        ? { likeCount: "desc" }
        : query.sortBy === "price_asc"
          ? { price: "asc" }
          : query.sortBy === "price_desc"
            ? { price: "desc" }
            : { createdAt: "desc" };

    const items = await this.prisma.project.findMany({
      where,
      orderBy,
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0
    });

    const { data, meta } = buildPagination(items, limit);
    return {
      success: true,
      data,
      meta
    };
  }

  /**
   * Gets project details by slug and increments view count.
   */
  async getBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug }, include: { author: true, media: true } });
    if (!project || project.deletedAt) {
      throw new NotFoundException("Project not found");
    }
    await this.prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });
    return project;
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
    return this.prisma.project.update({ where: { id: existing.id }, data: dto });
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
    return { archived: true };
  }

  /**
   * Toggles like and adjusts counter.
   */
  async toggleLike(slug: string): Promise<{ liked: true }> {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    await this.prisma.project.update({ where: { id: project.id }, data: { likeCount: { increment: 1 } } });
    return { liked: true };
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
      return { saved: false };
    }
    await this.prisma.saved.create({ data: { userId, projectId: project.id } });
    return { saved: true };
  }
}
