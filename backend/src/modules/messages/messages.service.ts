import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { PrismaService } from "src/prisma/prisma.service";
import { buildPagination } from "src/common/utils/pagination.util";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateThreadDto } from "src/modules/messages/dto/create-thread.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";

const wsTransport = WebSocket as unknown as never;

@Injectable()
export class MessagesService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
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

    const existing = await this.prisma.thread.findFirst({ where: { participantAId, participantBId, projectId: dto.projectId } });
    if (existing) {
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
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            isRead: false,
            senderId: { not: userId }
          }
        });
        return { ...thread, unreadCount };
      })
    );
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
    await this.assertThreadParticipant(userId, threadId);
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

    return { updated: result.count };
  }

  private async assertThreadParticipant(userId: string, threadId: string): Promise<void> {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException("You are not a participant in this thread");
    }
  }
}
