import { MilestonesService } from "src/modules/milestones/milestones.service";

describe("MilestonesService", () => {
  it("should be defined", () => {
    const service = new MilestonesService({} as never, {} as never, {} as never, { get: () => "" } as never);
    expect(service).toBeDefined();
  });
});
