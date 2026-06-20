jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({}))
}));

import { AdminService } from "src/modules/admin/admin.service";

describe("AdminService", () => {
  it("should be defined", () => {
    const getOrThrow = jest.fn((key: string) => {
      if (key === "SUPABASE_URL") {
        return "https://example.supabase.co";
      }

      if (key === "SUPABASE_SERVICE_ROLE_KEY") {
        return "service-role-key";
      }

      return "test-value";
    });

    const service = new AdminService({} as never, {
      getOrThrow
    } as never, {
      getSummary: jest.fn(),
      getRouteMetrics: jest.fn()
    } as never);
    expect(service).toBeDefined();
  });
});
