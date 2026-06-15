import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { sanitizeInput } from "src/common/utils/sanitize.util";

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists project questions by project slug.
   */
  async listByProjectSlug(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return this.prisma.question.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
  }

  /**
   * Creates a new question for project page.
   */
  async create(slug: string, askerId: string, content: string) {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.prisma.question.create({
      data: {
        projectId: project.id,
        askerId,
        content: sanitizeInput(content)
      }
    });
  }
}
