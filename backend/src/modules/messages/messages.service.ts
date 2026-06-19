import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { PrismaService } from "src/prisma/prisma.service";
import { buildPagination } from "src/common/utils/pagination.util";
import { NOTIFICATION_TYPE } from "src/common/constants/domain-enums.constant";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateThreadDto } from "src/modules/messages/dto/create-thread.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import { NotificationsService } from "src/modules/notifications/notifications.service";

const wsTransport = WebSocket as unknown as never;

@Injectable()
export class MessagesService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService
  ) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      { realtime: { transport: wsTransport } }
    );
  }

  /**
   * Creates or returns an existing direct-message thread.
   */
  async createThread(userId: string, dto: CreateThreadDto) {
    const participantAId = [userId, dto.recipientId].sort()[0] as string;
    const participantBId = [userId, dto.recipientId].sort()[1] as string;
    const existing = await this.prisma.thread.findFirst({
      where: { participantAId, participantBId },
      orderBy: { updatedAt: "desc" }
    });
    if (existing) {
      if (dto.initialMessage) {
        await this.sendMessage(userId, existing.id, { content: dto.initialMessage });
      }

      if (!existing.projectId && dto.projectId) {
        return this.prisma.thread.update({ where: { id: existing.id }, data: { projectId: dto.projectId } });
      }

      return existing;
    }

    const thread = await this.prisma.thread.create({
      data: {
        participantAId,
        participantBId,
        projectId: dto.projectId
      }
    });

    if (dto.initialMessage) {
      await this.sendMessage(userId, thread.id, { content: dto.initialMessage });
    }

    return thread;
  }

  /**
   * Lists all threads for authenticated user.
   */
  async listThreads(userId: string) {
    const threads = await this.prisma.thread.findMany({
      where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      include: {
        participantA: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        participantB: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        project: {
          select: {
            id: true,
            slug: true,
            title: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const unreadByThread = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            isRead: false,
            senderId: { not: userId }
          }
        });

        return {
          thread,
          unreadCount,
          partnerId: thread.participantAId === userId ? thread.participantBId : thread.participantAId
        };
      })
    );

    const consolidated = new Map<string, { thread: (typeof unreadByThread)[number]["thread"]; unreadCount: number }>();

    for (const item of unreadByThread) {
      const current = consolidated.get(item.partnerId);
      const itemTimestamp = new Date(item.thread.messages[0]?.createdAt ?? item.thread.updatedAt).getTime();

      if (!current) {
        consolidated.set(item.partnerId, { thread: item.thread, unreadCount: item.unreadCount });
        continue;
      }

      const currentTimestamp = new Date(current.thread.messages[0]?.createdAt ?? current.thread.updatedAt).getTime();
      const nextUnread = current.unreadCount + item.unreadCount;

      if (itemTimestamp > currentTimestamp) {
        consolidated.set(item.partnerId, { thread: item.thread, unreadCount: nextUnread });
      } else {
        consolidated.set(item.partnerId, { thread: current.thread, unreadCount: nextUnread });
      }
    }

    return [...consolidated.values()]
      .map(({ thread, unreadCount }) => ({ ...thread, unreadCount }))
      .sort((left, right) => {
        const leftTs = new Date(left.messages[0]?.createdAt ?? left.updatedAt).getTime();
        const rightTs = new Date(right.messages[0]?.createdAt ?? right.updatedAt).getTime();
        return rightTs - leftTs;
      });
  }

  /**
   * Returns lightweight quick-reply templates for active conversation.
   */
  async getQuickReplies(userId: string, threadId?: string) {
    if (threadId) {
      await this.assertThreadParticipant(userId, threadId);
    }

    const templates = [
      "Thanks for reaching out. I can take this on and share a delivery plan today.",
      "Could you share your target timeline, budget range, and key requirements?",
      "I reviewed your request and can propose a phased MVP approach to reduce risk.",
      "I am available this week. Would you like to schedule a quick kickoff call?",
      "I can send a detailed scope, milestone breakdown, and estimate in our next message."
    ];

    return {
      success: true,
      data: templates
    };
  }

  /**
   * Returns messages in a thread with cursor pagination.
   */
  async getThreadMessages(userId: string, threadId: string, cursor?: string, limit = 30) {
    await this.assertThreadParticipant(userId, threadId);
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1
    });
    const { data, meta } = buildPagination(messages, limit);
    return { success: true, data, meta };
  }

  /**
   * Sends a message and emits Supabase Realtime event.
   */
  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    const thread = await this.assertThreadParticipant(userId, threadId);
    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        content: sanitizeInput(dto.content)
      }
    });

    await this.prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    await this.supabase.channel(`thread:${threadId}`).send({
      type: "broadcast",
      event: "new_message",
      payload: message
    });

    const recipientId = thread.participantAId === userId ? thread.participantBId : thread.participantAId;

    try {
      await this.notificationsService.dispatch(recipientId, NOTIFICATION_TYPE.NEW_MESSAGE, {
        threadId,
        projectId: thread.projectId,
        senderId: userId,
        messageId: message.id,
        preview: message.content.slice(0, 160)
      });
    } catch {
      // Do not block chat delivery if notification dispatch fails.
    }

    return message;
  }

  /**
   * Marks all unread thread messages as read.
   */
  async markRead(userId: string, threadId: string): Promise<{ updated: number }> {
    await this.assertThreadParticipant(userId, threadId);
    const result = await this.prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    await this.prisma.notification.updateMany({
      where: {
        userId,
        type: NOTIFICATION_TYPE.NEW_MESSAGE,
        isRead: false,
        payload: {
          path: ["threadId"],
          equals: threadId
        }
      },
      data: {
        isRead: true
      }
    });

    return { updated: result.count };
  }

  private async assertThreadParticipant(userId: string, threadId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException("You are not a participant in this thread");
    }

    return thread;
  }
}
