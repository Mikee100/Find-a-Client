import { BadRequestException } from "@nestjs/common";
import { MilestonesService } from "src/modules/milestones/milestones.service";

const CLIENT_ID = "11111111-1111-1111-1111-111111111111";
const DEVELOPER_ID = "22222222-2222-2222-2222-222222222222";
const HIRE_REQUEST_ID = "33333333-3333-3333-3333-333333333333";

function buildHireRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: HIRE_REQUEST_ID,
    clientId: CLIENT_ID,
    developerId: DEVELOPER_ID,
    status: "ACCEPTED",
    proposalAmount: null,
    proposalCurrency: null,
    budgetAmount: null,
    budgetCurrency: null,
    ...overrides
  };
}

function buildService(options: {
  hireRequest: ReturnType<typeof buildHireRequest>;
  existingSum: number | null;
  createdMilestone?: Record<string, unknown>;
}) {
  const prisma = {
    hireRequest: {
      findUnique: jest.fn().mockResolvedValue(options.hireRequest)
    },
    milestone: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: options.existingSum } }),
      create: jest.fn().mockResolvedValue(
        options.createdMilestone ?? { id: "milestone-id", status: "PENDING", amount: 0, currency: "USD" }
      )
    },
    milestoneEvent: {
      create: jest.fn().mockResolvedValue({})
    }
  };

  const cacheService = {
    invalidateNamespace: jest.fn().mockResolvedValue(undefined)
  };

  const notificationsService = {
    dispatch: jest.fn().mockResolvedValue(undefined)
  };

  const configService = { get: () => "" };

  const service = new MilestonesService(
    prisma as never,
    notificationsService as never,
    cacheService as never,
    configService as never
  );

  return { service, prisma };
}

describe("MilestonesService", () => {
  it("should be defined", () => {
    const service = new MilestonesService({} as never, {} as never, {} as never, { get: () => "" } as never);
    expect(service).toBeDefined();
  });

  describe("createForHireRequest", () => {
    it("allows creating a second milestone on the same hire request", async () => {
      const { service, prisma } = buildService({
        hireRequest: buildHireRequest({ proposalAmount: null, budgetAmount: null }),
        existingSum: 500
      });

      await service.createForHireRequest(CLIENT_ID, "CLIENT", HIRE_REQUEST_ID, {
        title: "Phase 2",
        amount: 500
      } as never);

      expect(prisma.milestone.create).toHaveBeenCalledTimes(1);
    });

    it("rejects a milestone that would push the committed total past the proposal amount", async () => {
      const { service } = buildService({
        hireRequest: buildHireRequest({ proposalAmount: 1000 }),
        existingSum: 700
      });

      await expect(
        service.createForHireRequest(CLIENT_ID, "CLIENT", HIRE_REQUEST_ID, {
          title: "Phase 2",
          amount: 400
        } as never)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("allows a milestone that exactly fills the remaining proposal budget", async () => {
      const { service, prisma } = buildService({
        hireRequest: buildHireRequest({ proposalAmount: 1000 }),
        existingSum: 700
      });

      await service.createForHireRequest(CLIENT_ID, "CLIENT", HIRE_REQUEST_ID, {
        title: "Phase 2",
        amount: 300
      } as never);

      expect(prisma.milestone.create).toHaveBeenCalledTimes(1);
    });

    it("excludes refunded milestones from the committed total", async () => {
      // existingSum here represents the aggregate query result, which already
      // filters out REFUNDED milestones at the DB level (status: { not: "REFUNDED" }).
      const { service, prisma } = buildService({
        hireRequest: buildHireRequest({ proposalAmount: 1000 }),
        existingSum: 200
      });

      await service.createForHireRequest(CLIENT_ID, "CLIENT", HIRE_REQUEST_ID, {
        title: "Phase 2",
        amount: 800
      } as never);

      expect(prisma.milestone.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: "REFUNDED" } })
        })
      );
      expect(prisma.milestone.create).toHaveBeenCalledTimes(1);
    });

    it("skips the budget check entirely when no proposal or budget amount is set", async () => {
      const { service, prisma } = buildService({
        hireRequest: buildHireRequest({ proposalAmount: null, budgetAmount: null }),
        existingSum: null
      });

      await service.createForHireRequest(CLIENT_ID, "CLIENT", HIRE_REQUEST_ID, {
        title: "Uncapped phase",
        amount: 999999
      } as never);

      expect(prisma.milestone.aggregate).not.toHaveBeenCalled();
      expect(prisma.milestone.create).toHaveBeenCalledTimes(1);
    });
  });
});
