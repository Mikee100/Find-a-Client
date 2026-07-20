import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { PrismaService } from "src/prisma/prisma.service";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateReviewDto } from "src/modules/reviews/dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates one review per released milestone. A hire request with multiple
   * milestones (phased engagement) allows one review per released phase.
   */
  async create(projectSlug: string, reviewerId: string, role: UserRole, dto: CreateReviewDto) {
    if (role !== USER_ROLE.CLIENT) {
      throw new ForbiddenException("Only clients can review");
    }

    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const milestone = await this.prisma.milestone.findUnique({
      where: { id: dto.milestoneId },
      include: {
        hireRequest: true
      }
    });

    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }

    if (milestone.status !== "RELEASED") {
      throw new BadRequestException("Reviews are allowed only for released milestones");
    }

    if (milestone.hireRequest.clientId !== reviewerId) {
      throw new ForbiddenException("You can only review milestones you funded as a client");
    }

    if (project.authorId !== milestone.hireRequest.developerId) {
      throw new BadRequestException("Review project does not match the milestone developer");
    }

    if (milestone.hireRequest.projectId && milestone.hireRequest.projectId !== project.id) {
      throw new BadRequestException("Review project does not match the milestone project");
    }

    const review = await this.prisma.review.create({
      data: {
        projectId: project.id,
        reviewerId,
        milestoneId: milestone.id,
        rating: dto.rating,
        comment: dto.comment ? sanitizeInput(dto.comment) : null
      }
    });

    return review;
  }

  /**
   * Lists reviews for a project.
   */
  async list(projectSlug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.prisma.review.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
  }
}
