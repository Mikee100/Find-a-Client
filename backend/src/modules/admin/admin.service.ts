import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists pending moderation projects.
   */
  async moderationQueue() {
    return this.prisma.project.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Toggles project featured status.
   */
  async setFeatured(projectId: string, isFeatured: boolean) {
    return this.prisma.project.update({ where: { id: projectId }, data: { isFeatured } });
  }
}
