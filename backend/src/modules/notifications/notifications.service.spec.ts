import { NotificationsService } from "src/modules/notifications/notifications.service";

describe("NotificationsService", () => {
  it("should be defined", () => {
    const service = new NotificationsService(
      {} as never,
      { getOrThrow: jest.fn(() => "test") } as never,
      {} as never
    );
    expect(service).toBeDefined();
  });
});
