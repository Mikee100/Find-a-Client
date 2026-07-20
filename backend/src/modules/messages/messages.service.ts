import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { CacheService } from "src/common/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { buildPagination } from "src/common/utils/pagination.util";
import { NOTIFICATION_TYPE } from "src/common/constants/domain-enums.constant";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateThreadDto } from "src/modules/messages/dto/create-thread.dto";
import { SendMessageAttachmentDto } from "src/modules/messages/dto/send-message-attachment.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import { CloudinaryService } from "src/modules/media/cloudinary.service";
import { NotificationsService } from "src/modules/notifications/notifications.service";

const wsTransport = WebSocket as unknown as never;

@Injectable()
export class MessagesService {
  private readonly supabase: SupabaseClient;

  private readonly messageInclude = {
    attachments: {
      orderBy: {
        createdAt: "asc"
      }
    }
  } as const;

  private isTransientDatabaseError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === "P1001" || error.code === "P1002";
    }

    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes("can't reach database server") || message.includes("database is temporarily unavailable");
  }

  private async withDatabaseRetry<T>(operation: () => Promise<T>, label: string, retries = 2): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isTransientDatabaseError(error)) {
          throw error;
        }

        if (attempt >= retries) {
          throw new ServiceUnavailableException(`Messages service temporarily unavailable (${label}). Please try again.`);
        }

        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, attempt * 120));
      }
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService
  ) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      { realtime: { transport: wsTransport } }
    );
  }

  private async invalidateThreadList(userId: string) {
    await Promise.all([
      this.cacheService.invalidateNamespace(`threads-list:${userId}`),
      this.cacheService.invalidateNamespace(`developer-dashboard:${userId}`)
    ]);
  }

  private async invalidateThreadListsForParticipants(participantIds: string[]) {
    await Promise.all(participantIds.map((id) => this.invalidateThreadList(id)));
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

      await this.invalidateThreadListsForParticipants([existing.participantAId, existing.participantBId]);
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

    await this.invalidateThreadListsForParticipants([thread.participantAId, thread.participantBId]);

    return thread;
  }

  /**
   * Lists all threads for authenticated user.
   */
  async listThreads(userId: string) {
    const cacheKey = await this.cacheService.composeKey(`threads-list:${userId}`, "all");
    const cached = await this.cacheService.get<Array<Record<string, unknown>>>(cacheKey);

    if (cached) {
      return cached;
    }

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

    const threadIds = threads.map((thread) => thread.id);
    const unreadByThread =
      threadIds.length > 0
        ? await this.prisma.message.groupBy({
            by: ["threadId"],
            where: {
              threadId: { in: threadIds },
              isRead: false,
              senderId: { not: userId }
            },
            _count: {
              threadId: true
            }
          })
        : [];

    const unreadCountByThreadId = new Map<string, number>(
      unreadByThread.map((row) => [row.threadId, row._count.threadId])
    );

    const unreadByThreadWithContext = threads.map((thread) => ({
      thread,
      unreadCount: unreadCountByThreadId.get(thread.id) ?? 0,
      partnerId: thread.participantAId === userId ? thread.participantBId : thread.participantAId
    }));

    const consolidated = new Map<string, { thread: (typeof threads)[number]; unreadCount: number }>();

    for (const item of unreadByThreadWithContext) {
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

    const payload = [...consolidated.values()]
      .map(({ thread, unreadCount }) => ({ ...thread, unreadCount }))
      .sort((left, right) => {
        const leftTs = new Date(left.messages[0]?.createdAt ?? left.updatedAt).getTime();
        const rightTs = new Date(right.messages[0]?.createdAt ?? right.updatedAt).getTime();
        return rightTs - leftTs;
      });

    await this.cacheService.set(cacheKey, payload, 10);
    return payload;
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
    const messages = await this.withDatabaseRetry(
      () =>
        this.prisma.message.findMany({
          where: { threadId },
          include: this.messageInclude,
          orderBy: { createdAt: "desc" },
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          take: limit + 1
        }),
      "get-thread-messages"
    );
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
      },
      include: this.messageInclude
    });

    await this.prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    await this.supabase.channel(`thread:${threadId}`).send({
      type: "broadcast",
      event: "new_message",
      payload: message
    });

    await this.dispatchNewMessageNotification(threadId, thread, userId, message.id, message.content);

    await this.invalidateThreadListsForParticipants([thread.participantAId, thread.participantBId]);

    return message;
  }

  async sendAttachment(
    userId: string,
    threadId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
    dto: SendMessageAttachmentDto
  ) {
    if (!file) {
      throw new BadRequestException("Attachment file is required");
    }

    const thread = await this.assertThreadParticipant(userId, threadId);
    const resourceType: "image" | "video" | "raw" = file.mimetype.startsWith("image/")
      ? "image"
      : file.mimetype.startsWith("video/")
        ? "video"
        : "raw";
    const upload = await this.cloudinaryService.upload(file.buffer, `devshowcase/messages/${threadId}`, resourceType);

    const sanitizedContent = sanitizeInput(dto.content?.trim() || "");
    const messageContent = sanitizedContent || `Attachment: ${sanitizeInput(file.originalname)}`;

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        content: messageContent,
        attachments: {
          create: {
            url: upload.secure_url,
            publicId: upload.public_id,
            fileName: sanitizeInput(file.originalname),
            mimeType: file.mimetype,
            sizeBytes: file.size
          }
        }
      },
      include: this.messageInclude
    });

    await this.prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    await this.supabase.channel(`thread:${threadId}`).send({
      type: "broadcast",
      event: "new_message",
      payload: message
    });

    await this.dispatchNewMessageNotification(threadId, thread, userId, message.id, messageContent);

    await this.invalidateThreadListsForParticipants([thread.participantAId, thread.participantBId]);

    return message;
  }

  /**
   * Marks all unread thread messages as read.
   */
  async markRead(userId: string, threadId: string): Promise<{ updated: number }> {
    const thread = await this.assertThreadParticipant(userId, threadId);
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

    await this.invalidateThreadListsForParticipants([thread.participantAId, thread.participantBId]);

    return { updated: result.count };
  }

  private async assertThreadParticipant(userId: string, threadId: string) {
    const thread = await this.withDatabaseRetry(
      () => this.prisma.thread.findUnique({ where: { id: threadId } }),
      "assert-thread-participant"
    );
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException("You are not a participant in this thread");
    }

    return thread;
  }

  private async dispatchNewMessageNotification(
    threadId: string,
    thread: { participantAId: string; participantBId: string; projectId: string | null },
    senderId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    const recipientId = thread.participantAId === senderId ? thread.participantBId : thread.participantAId;

    try {
      const [sender, project] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: senderId },
          select: {
            fullName: true,
            username: true
          }
        }),
        thread.projectId
          ? this.prisma.project.findUnique({
              where: { id: thread.projectId },
              select: {
                title: true
              }
            })
          : Promise.resolve(null)
      ]);

      await this.notificationsService.dispatch(recipientId, NOTIFICATION_TYPE.NEW_MESSAGE, {
        threadId,
        projectId: thread.projectId,
        projectTitle: project?.title ?? null,
        senderId,
        senderName: sender?.fullName || sender?.username || null,
        messageId,
        preview: content.slice(0, 160)
      });
    } catch {
      // Do not block chat delivery if notification dispatch fails.
    }
  }
}
