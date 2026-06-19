import { NotificationsService } from "src/modules/notifications/notifications.service";

describe("NotificationsService", () => {
  it("should be defined", () => {
    const service = new NotificationsService(
      {} as never,
      {
        get: jest.fn((key: string, fallback?: string) => {
          if (key === "EMAIL_PROVIDER") {
            return "resend";
          }
          return fallback ?? "test";
        }),
        getOrThrow: jest.fn(() => "test")
      } as never
    );
    expect(service).toBeDefined();
  });
});
