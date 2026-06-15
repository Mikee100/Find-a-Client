import { AdminService } from "src/modules/admin/admin.service";

describe("AdminService", () => {
  it("should be defined", () => {
    const service = new AdminService({} as never);
    expect(service).toBeDefined();
  });
});
