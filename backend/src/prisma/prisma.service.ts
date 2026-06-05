import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Soft deletes a project by setting deletedAt timestamp.
   */
  async softDeleteProject(projectId: string): Promise<void> {
    await this.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), status: "ARCHIVED" }
    });
  }
}
