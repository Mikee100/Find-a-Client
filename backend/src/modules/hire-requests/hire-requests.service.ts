import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { HireRequestStatus } from "@prisma/client";
import { NOTIFICATION_TYPE } from "src/common/constants/domain-enums.constant";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateHireRequestDto } from "src/modules/hire-requests/dto/create-hire-request.dto";
import { ListHireRequestsDto } from "src/modules/hire-requests/dto/list-hire-requests.dto";
import { SubmitProposalDto } from "src/modules/hire-requests/dto/submit-proposal.dto";
import { UpdateHireRequestStatusDto } from "src/modules/hire-requests/dto/update-hire-request-status.dto";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class HireRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(clientId: string, role: UserRole, dto: CreateHireRequestDto) {
    if (role !== USER_ROLE.CLIENT && role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException("Only clients can create hire requests");
    }

    if (clientId === dto.developerId) {
      throw new ForbiddenException("You cannot create a hire request for yourself");
    }

    const developer = await this.prisma.user.findUnique({
      where: { id: dto.developerId },
      select: { id: true, role: true, fullName: true, username: true }
    });

    if (!developer || developer.role !== USER_ROLE.DEVELOPER) {
      throw new NotFoundException("Developer not found");
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { id: true, authorId: true, title: true }
      });

      if (!project) {
        throw new NotFoundException("Project not found");
      }

      if (project.authorId !== dto.developerId) {
        throw new ForbiddenException("Project does not belong to the selected developer");
      }
    }

    if (dto.threadId) {
      const thread = await this.prisma.thread.findUnique({ where: { id: dto.threadId } });
      if (!thread) {
        throw new NotFoundException("Thread not found");
      }

      const participants = new Set([thread.participantAId, thread.participantBId]);
      if (!participants.has(clientId) || !participants.has(dto.developerId)) {
        throw new ForbiddenException("Thread participants do not match this hire request");
      }
    }

    const hireRequest = await this.prisma.hireRequest.create({
      data: {
        clientId,
        developerId: dto.developerId,
        projectId: dto.projectId,
        threadId: dto.threadId,
        brief: sanitizeInput(dto.brief),
        budgetAmount: dto.budgetAmount,
        budgetCurrency: dto.budgetCurrency?.toUpperCase(),
        timelineDays: dto.timelineDays
      },
      include: {
        project: {
          select: {
            id: true,
            slug: true,
            title: true
          }
        }
      }
    });

    try {
      await this.notificationsService.dispatch(dto.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        clientId,
        projectId: hireRequest.projectId,
        projectTitle: hireRequest.project?.title ?? null,
        status: hireRequest.status
      });
    } catch {
      // Do not fail request creation if notification fails.
    }

    return hireRequest;
  }

  async list(userId: string, role: UserRole, query: ListHireRequestsDto) {
    const limit = query.limit ?? 30;

    const where =
      role === USER_ROLE.ADMIN
        ? {
            status: query.status
          }
        : {
            status: query.status,
            ...(query.scope === "sent"
              ? { clientId: userId }
              : query.scope === "received"
                ? { developerId: userId }
                : { OR: [{ clientId: userId }, { developerId: userId }] })
          };

    return this.prisma.hireRequest.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        developer: {
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
        thread: {
          select: {
            id: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }

  async getById(userId: string, role: UserRole, hireRequestId: string) {
    const hireRequest = await this.prisma.hireRequest.findUnique({
      where: { id: hireRequestId },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        developer: {
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
        thread: {
          select: {
            id: true,
            updatedAt: true
          }
        }
      }
    });

    if (!hireRequest) {
      throw new NotFoundException("Hire request not found");
    }

    if (role !== USER_ROLE.ADMIN && hireRequest.clientId !== userId && hireRequest.developerId !== userId) {
      throw new ForbiddenException("You do not have access to this hire request");
    }

    return hireRequest;
  }

  async updateStatus(userId: string, role: UserRole, hireRequestId: string, dto: UpdateHireRequestStatusDto) {
    const hireRequest = await this.prisma.hireRequest.findUnique({ where: { id: hireRequestId } });
    if (!hireRequest) {
      throw new NotFoundException("Hire request not found");
    }

    const isAdmin = role === USER_ROLE.ADMIN;
    const isClient = hireRequest.clientId === userId;
    const isDeveloper = hireRequest.developerId === userId;

    if (!isAdmin && !isClient && !isDeveloper) {
      throw new ForbiddenException("You do not have access to this hire request");
    }

    if (!isAdmin) {
      this.assertStatusChangeAllowed(hireRequest.status, dto.status, isClient ? "client" : "developer");
    }

    return this.prisma.hireRequest.update({
      where: { id: hireRequest.id },
      data: {
        status: dto.status
      }
    });
  }

  async submitProposal(userId: string, role: UserRole, hireRequestId: string, dto: SubmitProposalDto) {
    const hireRequest = await this.prisma.hireRequest.findUnique({ where: { id: hireRequestId } });
    if (!hireRequest) {
      throw new NotFoundException("Hire request not found");
    }

    const isAdmin = role === USER_ROLE.ADMIN;
    if (!isAdmin && hireRequest.developerId !== userId) {
      throw new ForbiddenException("Only the selected developer can submit a proposal");
    }

    if (
      hireRequest.status === "ACCEPTED" ||
      hireRequest.status === "REJECTED" ||
      hireRequest.status === "CANCELLED"
    ) {
      throw new ForbiddenException("Cannot submit a proposal for a closed hire request");
    }

    const updated = await this.prisma.hireRequest.update({
      where: { id: hireRequest.id },
      data: {
        proposalMessage: sanitizeInput(dto.proposalMessage),
        proposalAmount: dto.proposalAmount,
        proposalCurrency: dto.proposalCurrency?.toUpperCase(),
        proposalTimelineDays: dto.proposalTimelineDays,
        proposedAt: new Date(),
        status: "PROPOSAL_SENT"
      }
    });

    try {
      await this.notificationsService.dispatch(hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        developerId: hireRequest.developerId,
        status: updated.status
      });
    } catch {
      // Do not fail proposal submission when notification dispatch fails.
    }

    return updated;
  }

  private assertStatusChangeAllowed(current: HireRequestStatus, next: HireRequestStatus, actor: "client" | "developer") {
    if (current === next) {
      return;
    }

    const closedStates: HireRequestStatus[] = ["ACCEPTED", "REJECTED", "CANCELLED"];
    if (closedStates.includes(current)) {
      throw new ForbiddenException("Cannot change status of a closed hire request");
    }

    const clientTransitions: Partial<Record<HireRequestStatus, HireRequestStatus[]>> = {
      PENDING: ["CANCELLED", "REJECTED"],
      REVIEWING: ["CANCELLED"],
      PROPOSAL_SENT: ["NEGOTIATING", "ACCEPTED", "REJECTED", "CANCELLED"],
      NEGOTIATING: ["PROPOSAL_SENT", "ACCEPTED", "REJECTED", "CANCELLED"]
    };

    const developerTransitions: Partial<Record<HireRequestStatus, HireRequestStatus[]>> = {
      PENDING: ["REVIEWING", "REJECTED"],
      REVIEWING: ["PROPOSAL_SENT", "NEGOTIATING", "REJECTED"],
      PROPOSAL_SENT: ["NEGOTIATING", "REJECTED"],
      NEGOTIATING: ["PROPOSAL_SENT", "REJECTED"]
    };

    const allowed = actor === "client" ? clientTransitions[current] ?? [] : developerTransitions[current] ?? [];

    if (!allowed.includes(next)) {
      throw new ForbiddenException("Status transition is not allowed");
    }
  }
}
