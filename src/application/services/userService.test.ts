import { describe, expect, it, vi } from "vitest";

import * as userRepository from "@/application/repositories/userRepository";
import { resolveSessionUser } from "@/application/services/userService";

describe("userService", () => {
  it("resolves a server session through the user repository and strips sensitive fields", async () => {
    const findByIdSpy = vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      password: "secret",
      roles: ["admin"],
      verificationToken: "token",
      verificationTokenExpiry: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const session = {
      user: {
        id: "user-1",
        roles: ["admin"],
      },
    };

    const result = await resolveSessionUser(session);

    expect(findByIdSpy).toHaveBeenCalledWith("user-1");
    expect(result).toMatchObject({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      roles: ["admin"],
      role: "ADMIN",
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("verificationToken");
  });

  it("returns null when the auth session is missing or invalid", async () => {
    const findByIdSpy = vi.spyOn(userRepository, "findById");

    await expect(resolveSessionUser(null)).resolves.toBeNull();
    await expect(resolveSessionUser({ error: "bad session" })).resolves.toBeNull();
    await expect(resolveSessionUser({ user: { id: undefined } })).resolves.toBeNull();
    expect(findByIdSpy).not.toHaveBeenCalled();
  });
});
