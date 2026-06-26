import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Resend } from "resend";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { NOTIFICATION_TYPE, NotificationType } from "src/common/constants/domain-enums.constant";
import { CacheService } from "src/common/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { buildPagination } from "src/common/utils/pagination.util";

type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "REJECTED" | "FAILED";

@Injectable()
export class NotificationsService {
  private readonly resend?: Resend;
  private readonly smtpTransport?: Transporter;
  private readonly provider: "resend" | "smtp";
  private readonly defaultFrom: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {
    this.defaultFrom = this.configService.get<string>("EMAIL_FROM", "Find a Client <noreply@findaclient.app>");
    const configuredProvider = this.configService.get<string>("EMAIL_PROVIDER", "resend").toLowerCase();
    this.provider = configuredProvider === "smtp" ? "smtp" : "resend";

    if (this.provider === "smtp") {
      const smtpPort = Number(this.configService.get<string>("SMTP_PORT", "587"));
      const smtpSecure = this.configService.get<string>("SMTP_SECURE", "false") === "true";

      this.smtpTransport = nodemailer.createTransport({
        host: this.configService.getOrThrow<string>("SMTP_HOST"),
        port: Number.isFinite(smtpPort) ? smtpPort : 587,
        secure: smtpSecure,
        auth: {
          user: this.configService.getOrThrow<string>("SMTP_USER"),
          pass: this.configService.getOrThrow<string>("SMTP_PASS")
        }
      });

      return;
    }

    this.resend = new Resend(this.configService.getOrThrow<string>("RESEND_API_KEY"));
  }

  private async invalidateNotificationsCache(userId: string) {
    await Promise.all([
      this.cacheService.invalidateNamespace(`notifications-list:${userId}`),
      this.cacheService.invalidateNamespace(`notifications-unread-count:${userId}`),
      this.cacheService.invalidateNamespace(`developer-dashboard:${userId}`)
    ]);
  }

  private mapEventToStatus(eventType: string): DeliveryStatus {
    const normalized = eventType.toLowerCase();
    if (normalized.includes("delivered")) {
      return "DELIVERED";
    }
    if (normalized.includes("bounce") || normalized.includes("bounced")) {
      return "BOUNCED";
    }
    if (normalized.includes("reject") || normalized.includes("complain")) {
      return "REJECTED";
    }
    if (normalized.includes("sent") || normalized.includes("queued")) {
      return "SENT";
    }

    return "QUEUED";
  }

  private getEmailDeliveryDelegate():
    | {
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<unknown>;
        updateMany: (args: unknown) => Promise<{ count: number }>;
      }
    | null {
    const delegate = (this.prisma as PrismaService & {
      emailDeliveryLog?: {
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<unknown>;
        updateMany: (args: unknown) => Promise<{ count: number }>;
      };
    }).emailDeliveryLog;

    return delegate ?? null;
  }

  private async createDeliveryLog(args: {
    toEmail: string;
    subject: string;
    templateKey?: string;
    status?: DeliveryStatus;
    eventType?: string;
    messageId?: string;
    metadata?: Prisma.InputJsonValue;
    errorMessage?: string;
  }): Promise<{ id: string }> {
    const delegate = this.getEmailDeliveryDelegate();
    if (!delegate) {
      return { id: randomUUID() };
    }

    try {
      return await delegate.create({
        data: {
          provider: this.provider,
          toEmail: args.toEmail,
          subject: args.subject,
          templateKey: args.templateKey,
          status: args.status ?? "QUEUED",
          eventType: args.eventType,
          messageId: args.messageId,
          metadata: args.metadata,
          errorMessage: args.errorMessage
        },
        select: {
          id: true
        }
      });
    } catch {
      return { id: randomUUID() };
    }
  }

  private async updateDeliveryLog(logId: string, args: { status?: DeliveryStatus; messageId?: string; eventType?: string; errorMessage?: string }): Promise<void> {
    const delegate = this.getEmailDeliveryDelegate();
    if (!delegate) {
      return;
    }

    try {
      await delegate.update({
        where: { id: logId },
        data: {
          status: args.status,
          messageId: args.messageId,
          eventType: args.eventType,
          errorMessage: args.errorMessage
        }
      });
    } catch {
      // Delivery logging is best-effort and must not block auth flows.
    }
  }

  private async sendEmail(to: string, subject: string, html: string, templateKey?: string): Promise<void> {
    const log = await this.createDeliveryLog({
      toEmail: to,
      subject,
      templateKey,
      status: "QUEUED",
      eventType: "queued"
    });

    if (this.provider === "smtp") {
      if (!this.smtpTransport) {
        await this.updateDeliveryLog(log.id, {
          status: "FAILED",
          eventType: "smtp_config_error",
          errorMessage: "SMTP transport is not configured."
        });
        throw new Error("SMTP transport is not configured.");
      }

      try {
        const result = await this.smtpTransport.sendMail({
          from: this.defaultFrom,
          to,
          subject,
          html
        });

        await this.updateDeliveryLog(log.id, {
          status: "SENT",
          eventType: "smtp_sent",
          messageId: result.messageId
        });
      } catch (error) {
        await this.updateDeliveryLog(log.id, {
          status: "FAILED",
          eventType: "smtp_failed",
          errorMessage: error instanceof Error ? error.message : "SMTP send failed"
        });
        throw error;
      }

      return;
    }

    if (!this.resend) {
      await this.updateDeliveryLog(log.id, {
        status: "FAILED",
        eventType: "resend_config_error",
        errorMessage: "Resend client is not configured."
      });
      throw new Error("Resend client is not configured.");
    }

    const response = await this.resend.emails.send({
      from: this.defaultFrom,
      to,
      subject,
      html
    });

    if (response.error) {
      await this.updateDeliveryLog(log.id, {
        status: "FAILED",
        eventType: "resend_failed",
        errorMessage: response.error.message
      });
      throw new Error(response.error.message);
    }

    await this.updateDeliveryLog(log.id, {
      status: "SENT",
      eventType: "resend_sent",
      messageId: response.data?.id
    });
  }

  /**
   * Lists notifications ordered by unread first.
   */
  async list(userId: string, cursor?: string, limit = 20) {
    const cacheKey = await this.cacheService.composeKey(
      `notifications-list:${userId}`,
      JSON.stringify({ cursor: cursor ?? null, limit })
    );
    const cached = await this.cacheService.get<{
      success: true;
      data: unknown[];
      meta: Record<string, unknown>;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1
    });

    const { data, meta } = buildPagination(items, limit);
    const payload = { success: true, data, meta };
    await this.cacheService.set(cacheKey, payload, 10);
    return payload;
  }

  /**
   * Marks all notifications as read.
   */
  async readAll(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    await this.invalidateNotificationsCache(userId);
    return { updated: result.count };
  }

  /**
   * Marks a single notification as read for the authenticated user.
   */
  async readOne(userId: string, notificationId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    await this.invalidateNotificationsCache(userId);
    return { updated: result.count };
  }

  /**
   * Returns unread notification count for the authenticated user.
   */
  async unreadCount(userId: string): Promise<{ unread: number }> {
    const cacheKey = await this.cacheService.composeKey(`notifications-unread-count:${userId}`, "value");
    const cached = await this.cacheService.get<{ unread: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    const unread = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    const payload = { unread };
    await this.cacheService.set(cacheKey, payload, 10);
    return payload;
  }

  /**
   * Dispatches notification workflows.
   */
  async dispatch(userId: string, type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    await this.prisma.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });
    await this.invalidateNotificationsCache(userId);

    if (type === NOTIFICATION_TYPE.NEW_MESSAGE || type === NOTIFICATION_TYPE.DEAL_INTEREST) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.sendEmail(
          user.email,
          `New ${type.toLowerCase().replace("_", " ")}`,
          `<p>You have a new ${type.toLowerCase()} notification in DevShowcase.</p>`
        );
      }
    }
  }

  async sendAccountVerificationEmail(email: string, fullName: string, verifyUrl: string): Promise<void> {
    await this.sendEmail(
      email,
      "Verify your Find a Client account",
      `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
          <h2 style="margin-bottom:8px">Welcome${fullName ? `, ${fullName}` : ""}</h2>
          <p>Please verify your account to activate sign in and messaging features.</p>
          <p style="margin:20px 0">
            <a href="${verifyUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Verify account</a>
          </p>
          <p style="font-size:13px;color:#555">If you did not create this account, you can ignore this email.</p>
        </div>
      `,
      "verify_email"
    );
  }

  async sendPasswordResetEmail(email: string, fullName: string, resetUrl: string): Promise<void> {
    await this.sendEmail(
      email,
      "Reset your Find a Client password",
      `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
          <h2 style="margin-bottom:8px">Password reset request</h2>
          <p>Hi${fullName ? ` ${fullName}` : ""}, we received a request to reset your password.</p>
          <p style="margin:20px 0">
            <a href="${resetUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Reset password</a>
          </p>
          <p style="font-size:13px;color:#555">If you did not request this, no action is required.</p>
        </div>
      `,
      "reset_password"
    );
  }

  async processResendWebhook(payload: Record<string, unknown>, secretHeader?: string): Promise<{ received: true }> {
    const configuredSecret = this.configService.get<string>("RESEND_WEBHOOK_SECRET", "").trim();
    if (configuredSecret && configuredSecret !== (secretHeader ?? "").trim()) {
      throw new HttpException("Invalid webhook secret", HttpStatus.FORBIDDEN);
    }

    const type = String(payload.type ?? payload.event ?? "unknown");
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const messageId = String(data.email_id ?? data.id ?? "").trim();
    const toEmailRaw = data.to;
    const toEmail = Array.isArray(toEmailRaw) ? String(toEmailRaw[0] ?? "") : String(toEmailRaw ?? "");
    const subject = String(data.subject ?? "Resend event");
    const status = this.mapEventToStatus(type);

    if (!messageId) {
      await this.createDeliveryLog({
        toEmail,
        subject,
        templateKey: "webhook_unknown",
        status,
        eventType: type,
        metadata: payload as Prisma.InputJsonValue
      });
      return { received: true };
    }

    const delegate = this.getEmailDeliveryDelegate();
    if (!delegate) {
      return { received: true };
    }

    const updated = await delegate.updateMany({
      where: { messageId },
      data: {
        status,
        eventType: type,
        metadata: payload as Prisma.InputJsonValue
      }
    });

    if (updated.count === 0) {
      await this.createDeliveryLog({
        toEmail,
        subject,
        templateKey: "webhook_only",
        status,
        eventType: type,
        messageId,
        metadata: payload as Prisma.InputJsonValue
      });
    }

    return { received: true };
  }
}
