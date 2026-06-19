import { NotificationsService } from "src/modules/notifications/notifications.service";

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn()
    }
  }))
}));

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
      } as never,
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
