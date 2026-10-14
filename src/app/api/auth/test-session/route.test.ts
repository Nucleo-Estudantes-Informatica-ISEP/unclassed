import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  E2E_TEST_SECRET: "a-secret-that-is-long-enough-32c", // gitleaks:allow
  AUTH_SECRET: "auth-secret-32-chars-long-minimum" as string | undefined, // gitleaks:allow
  NODE_ENV: "test" as string,
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("next-auth/jwt", () => ({ encode: vi.fn().mockResolvedValue("mock-token") }));
vi.mock("@/application/repositories/userRepository", () => ({
  create: vi.fn().mockResolvedValue({
    id: "user-123",
    name: "E2E User",
    email: "e2e@example.test",
    role: "USER",
  }),
  deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
}));

import { encode } from "next-auth/jwt";
import * as userRepo from "@/application/repositories/userRepository";
import { DELETE, POST } from "./route";

function makeRequest(url: string, secret?: string, method: "POST" | "DELETE" = "POST", body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      ...(secret ? { "x-e2e-secret": secret } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_SECRET = "a-secret-that-is-long-enough-32c"; // gitleaks:allow

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.NODE_ENV = "test";
  mockEnv.AUTH_SECRET = "auth-secret-32-chars-long-minimum"; // gitleaks:allow
});

describe("POST /api/auth/test-session", () => {
  test("returns 404 when x-e2e-secret header is missing", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session"));
    expect(res.status).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("returns 404 when x-e2e-secret header does not match", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session", "wrong-secret"));
    expect(res.status).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("returns 404 in production regardless of secret", async () => {
    mockEnv.NODE_ENV = "production";
    const res = await POST(makeRequest("http://localhost/api/auth/test-session", VALID_SECRET));
    expect(res.status).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("returns 500 when AUTH_SECRET is not configured", async () => {
    mockEnv.AUTH_SECRET = undefined;
    const res = await POST(makeRequest("http://localhost/api/auth/test-session", VALID_SECRET));
    expect(res.status).toBe(500);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("creates USER session with correct response, cookie and JWT payload", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session?role=USER", VALID_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: "user-123", role: "USER" });
    expect(res.headers.get("set-cookie")).toContain("authjs.session-token=mock-token");
    expect(vi.mocked(encode)).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({ authNeiRoles: [], role: "USER" }),
      })
    );
  });

  test("creates ADMIN session with correct response, cookie and JWT payload", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session?role=ADMIN", VALID_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: "user-123", role: "ADMIN" });
    expect(res.headers.get("set-cookie")).toContain("authjs.session-token=mock-token");
    expect(vi.mocked(encode)).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({ authNeiRoles: ["admin"], role: "ADMIN" }),
      })
    );
  });

  test("defaults to USER role when role param is absent", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session", VALID_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe("USER");
  });

  test("defaults to USER role for unrecognised role values", async () => {
    const res = await POST(makeRequest("http://localhost/api/auth/test-session?role=SUPERUSER", VALID_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe("USER");
  });
});

describe("DELETE /api/auth/test-session", () => {
  test("returns 404 when x-e2e-secret header is missing", async () => {
    const res = await DELETE(makeRequest("http://localhost/api/auth/test-session", undefined, "DELETE", { userId: "user-123" }));
    expect(res.status).toBe(404);
    expect(userRepo.deleteMany).not.toHaveBeenCalled();
  });

  test("returns 400 when userId is missing", async () => {
    const res = await DELETE(makeRequest("http://localhost/api/auth/test-session", VALID_SECRET, "DELETE", {}));
    expect(res.status).toBe(400);
    expect(userRepo.deleteMany).not.toHaveBeenCalled();
  });

  test("deletes the user with the given userId", async () => {
    const res = await DELETE(makeRequest("http://localhost/api/auth/test-session", VALID_SECRET, "DELETE", { userId: "user-123" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(userRepo.deleteMany)).toHaveBeenCalledWith({ where: { id: "user-123" } });
  });
});
