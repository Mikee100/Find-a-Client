import { UsersService } from "src/modules/users/users.service";

describe("UsersService", () => {
  it("should be defined", () => {
    const service = new UsersService(
      {} as never,
      {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        composeKey: jest.fn(),
        invalidateNamespace: jest.fn()
      } as never
    );
    expect(service).toBeDefined();
  });
});
