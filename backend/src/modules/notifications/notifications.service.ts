import { Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Resend } from "resend";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { buildPagination } from "src/common/utils/pagination.util";

@Injectable()
export class NotificationsService {
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.resend = new Resend(this.configService.getOrThrow<string>("RESEND_API_KEY"));
  }

  /**
   * Lists notifications ordered by unread first.
   */
  async list(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1
    });

    const { data, meta } = buildPagination(items, limit);
    return { success: true, data, meta };
  }

  /**
   * Marks all notifications as read.
   */
  async readAll(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { updated: result.count };
  }

  /**
   * Dispatches notification workflows.
   */
  async dispatch(userId: string, type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    await this.prisma.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });

    if (type === NotificationType.NEW_MESSAGE || type === NotificationType.DEAL_INTEREST) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.resend.emails.send({
          from: "DevShowcase <noreply@devshowcase.app>",
          to: user.email,
          subject: `New ${type.toLowerCase().replace("_", " ")}`,
          html: `<p>You have a new ${type.toLowerCase()} notification in DevShowcase.</p>`
        });
      }
    }
  }
}
