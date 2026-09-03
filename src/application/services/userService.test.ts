import { describe, expect, it, vi } from "vitest";

import * as userRepository from "@/application/repositories/userRepository";
import {
  getPreferences,
  markOnboardingComplete,
  resolveSessionUser,
  updatePreferences,
} from "@/application/services/userService";

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

  it("falls back to authNeiRoles when the session has no direct role claim", async () => {
    const findByIdSpy = vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-2",
      name: "Bruno",
      email: "bruno@example.com",
      password: "secret",
      verificationToken: "token",
      verificationTokenExpiry: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const session = {
      user: {
        id: "user-2",
        authNeiRoles: ["admin"],
      },
    };

    const result = await resolveSessionUser(session);

    expect(findByIdSpy).toHaveBeenCalledWith("user-2");
    expect(result).toMatchObject({
      id: "user-2",
      name: "Bruno",
      role: "ADMIN",
      roles: ["admin"],
    });
  });

  it("returns null when the auth session is missing or invalid", async () => {
    const findByIdSpy = vi.spyOn(userRepository, "findById");

    await expect(resolveSessionUser(null)).resolves.toBeNull();
    await expect(resolveSessionUser({ error: "bad session" })).resolves.toBeNull();
    await expect(resolveSessionUser({ user: { id: undefined } })).resolves.toBeNull();
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  it("delegates preference reads and updates to the user repository", async () => {
    const preferences = {
      phone: "912345678",
      emailNotifications: true,
      emailVerified: true,
      sharePhoneOnMatch: false,
    };
    const getPreferencesSpy = vi
      .spyOn(userRepository, "findPreferencesById")
      .mockResolvedValue(preferences as never);
    const updatePreferencesSpy = vi
      .spyOn(userRepository, "updatePreferences")
      .mockResolvedValue({ ...preferences, phone: "912345678" } as never);

    await expect(getPreferences("user-3")).resolves.toBe(preferences);
    await expect(
      updatePreferences("user-3", { phone: "912345678" })
    ).resolves.toEqual({ ...preferences, phone: "912345678" });

    expect(getPreferencesSpy).toHaveBeenCalledWith("user-3");
    expect(updatePreferencesSpy).toHaveBeenCalledWith("user-3", {
      phone: "912345678",
    });
  });

  it("validates boolean and phone fields before updating user preferences", async () => {
    const updatePreferencesSpy = vi
      .spyOn(userRepository, "updatePreferences")
      .mockResolvedValue({ phone: "912345678" } as never);

    await expect(
      updatePreferences("user-5", { emailNotifications: "yes" as never })
    ).rejects.toThrow("emailNotifications deve ser um valor booleano");

    await expect(
      updatePreferences("user-5", { sharePhoneOnMatch: "no" as never })
    ).rejects.toThrow("sharePhoneOnMatch deve ser um valor booleano");

    await expect(
      updatePreferences("user-5", { phone: "abc" })
    ).rejects.toThrow("Número de telemóvel inválido");

    await expect(
      updatePreferences("user-5", { phone: "912345678" })
    ).resolves.toEqual({ phone: "912345678" });

    expect(updatePreferencesSpy).toHaveBeenCalledWith("user-5", {
      phone: "912345678",
    });
  });

  it("delegates onboarding completion to the user repository", async () => {
    const markOnboardingCompleteSpy = vi
      .spyOn(userRepository, "markOnboardingComplete")
      .mockResolvedValue({ count: 1 } as never);

    await expect(markOnboardingComplete("user-4")).resolves.toEqual({ count: 1 });
    expect(markOnboardingCompleteSpy).toHaveBeenCalledWith("user-4");
  });
});
