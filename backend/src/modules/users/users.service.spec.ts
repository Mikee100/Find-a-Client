import { UsersService } from "src/modules/users/users.service";

describe("UsersService", () => {
  it("should be defined", () => {
    const service = new UsersService({} as never);
    expect(service).toBeDefined();
  });
});
