import { InjectQueue } from "@nestjs/bullmq";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "src/prisma/prisma.service";
import { QUEUE_NAMES } from "src/queue/queue.constants";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateReviewDto } from "src/modules/reviews/dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.reviews) private readonly reviewQueue: Queue
  ) {}

  /**
   * Creates one review per client per project.
   */
  async create(projectSlug: string, reviewerId: string, role: UserRole, dto: CreateReviewDto) {
    if (role !== UserRole.CLIENT) {
      throw new ForbiddenException("Only clients can review");
    }

    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const review = await this.prisma.review.create({
      data: {
        projectId: project.id,
        reviewerId,
        rating: dto.rating,
        comment: dto.comment ? sanitizeInput(dto.comment) : null
      }
    });

    await this.reviewQueue.add("recalculate-rating", { projectId: project.id });
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
