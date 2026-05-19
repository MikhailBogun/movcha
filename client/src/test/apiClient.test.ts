import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";

// Re-export the private helper by testing the observable behaviour through register()
// which calls request() internally.

describe("ApiError", () => {
  it("carries status and message", () => {
    const err = new ApiError(422, "too short");
    expect(err.status).toBe(422);
    expect(err.message).toBe("too short");
    expect(err instanceof Error).toBe(true);
  });
});

describe("request — error parsing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("extracts plain string detail from API error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ detail: "Invalid credentials" }),
    } as unknown as Response);

    const { register } = await import("../api/client");
    await expect(register("a@b.com", "pass")).rejects.toMatchObject({
      status: 401,
      message: "Invalid credentials",
    });
  });

  it("joins array detail (FastAPI 422) into readable message", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({
        detail: [
          { msg: "Password must be at least 6 characters" },
          { msg: "value is not a valid email address" },
        ],
      }),
    } as unknown as Response);

    const { register } = await import("../api/client");
    await expect(register("bad", "x")).rejects.toMatchObject({
      status: 422,
      message:
        "Password must be at least 6 characters; value is not a valid email address",
    });
  });
});
