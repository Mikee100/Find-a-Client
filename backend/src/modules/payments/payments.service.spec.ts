import { PaymentsService } from "src/modules/payments/payments.service";

describe("PaymentsService", () => {
  it("should be defined", () => {
    const service = new PaymentsService({} as never, { get: () => "" } as never, {} as never);
    expect(service).toBeDefined();
  });
});
