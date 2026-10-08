import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/application/repositories/classRepository", () => ({
  findClasses: vi.fn(),
  findById: vi.fn(),
  hasNameConflict: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  isInUse: vi.fn(),
}));

import * as classRepo from "@/application/repositories/classRepository";
import { authorizeRequest } from "@/lib/apiAccess";
import { GET, POST, PATCH, DELETE } from "./route";

const apiUrl = "http://localhost:3000/api/classes";
const validData = { name: "1DA", year: 1 };
const existing = { id: "item-1", name: "1DA", year: 1 };
const patchData = { name: "1DB" };
const updated = { id: "item-1", name: "1DB", year: 1 };

function authorizeAdmin() {
  vi.mocked(authorizeRequest).mockResolvedValueOnce({
    ok: true,
    authenticatedBy: "session",
    session: { id: "admin-1", role: "ADMIN" },
  } as never);
}

function denyAccess() {
  vi.mocked(authorizeRequest).mockResolvedValueOnce({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status: 403 }),
  });
}

function makeRequest(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  return new NextRequest(apiUrl, { method, body: JSON.stringify(body) });
}

function makeInvalidJsonRequest(method: "POST" | "PATCH" | "DELETE") {
  return new NextRequest(apiUrl, { method, body: "{invalid" });
}

function prismaError(code: string) {
  return Object.assign(new Error("Database error"), { code });
}

describe("/api/classes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(classRepo.isInUse).mockResolvedValue(false);
    vi.mocked(classRepo.hasNameConflict).mockResolvedValue(false);
  });

  it("returns data for authenticated GET", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findClasses).mockResolvedValueOnce([existing] as never);
    const response = await GET(new NextRequest(apiUrl));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([existing]);
  });

  it("filters classes by year", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findClasses).mockResolvedValueOnce([]);
    const request = new NextRequest(`${apiUrl}?year=2`);
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(classRepo.findClasses).toHaveBeenCalledWith({ year: 2 });
  });

  it.each(["0", "4", "abc", "1.5"])('rejects invalid class year %s', async (year) => {
    authorizeAdmin();
    const response = await GET(new NextRequest(`${apiUrl}?year=${year}`));
    expect(response.status).toBe(400);
    expect(classRepo.findClasses).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", POST, validData],
    ["PATCH", PATCH, { id: "item-1", ...patchData }],
    ["DELETE", DELETE, { id: "item-1" }],
  ] as const)("rejects unauthorized %s requests", async (method, handler, body) => {
    denyAccess();
    const request = makeRequest(method, body);
    const response = await handler(request);
    expect(response.status).toBe(403);
    expect(authorizeRequest).toHaveBeenCalledWith(request, {
      requireAdmin: true,
      enforceSameOriginForSessionWrites: true,
    });
  });

  it("creates a class", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.create).mockResolvedValueOnce(existing as never);
    const response = await POST(makeRequest("POST", validData));
    expect(response.status).toBe(201);
    expect(classRepo.create).toHaveBeenCalledWith({ data: validData });
    expect(await response.json()).toEqual(existing);
  });

  it("rejects invalid creation data", async () => {
    authorizeAdmin();
    const response = await POST(makeRequest("POST", { ...validData, year: 4 }));
    expect(response.status).toBe(400);
    expect(classRepo.create).not.toHaveBeenCalled();
  });

  it("updates a class", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(existing as never);
    vi.mocked(classRepo.update).mockResolvedValueOnce(updated as never);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", ...patchData }));
    expect(response.status).toBe(200);
    expect(classRepo.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: patchData,
    });
    expect(await response.json()).toEqual(updated);
  });

  it("rejects an update without fields", async () => {
    authorizeAdmin();
    const response = await PATCH(makeRequest("PATCH", { id: "item-1" }));
    expect(response.status).toBe(400);
    expect(classRepo.update).not.toHaveBeenCalled();
  });

  it("rejects changing the year without changing the class name", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(existing as never);
    vi.mocked(classRepo.update).mockResolvedValueOnce({ ...existing, year: 2 } as never);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", year: 2 }));
    expect(response.status).toBe(400);
    expect(classRepo.update).not.toHaveBeenCalled();
  });

  it("accepts a class name with a free-form suffix", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.create).mockResolvedValueOnce({ id: "item-2", name: "1 Special Group", year: 1 } as never);
    const response = await POST(makeRequest("POST", { name: "1 Special Group", year: 1 }));
    expect(response.status).toBe(201);
  });

  it.each(["1DB", "1db", " 1DB "])("rejects an identical class name on create: %s", async (name) => {
    authorizeAdmin();
    vi.mocked(classRepo.hasNameConflict).mockResolvedValueOnce(true);
    const response = await POST(makeRequest("POST", { name, year: 1 }));
    expect(response.status).toBe(409);
    expect(classRepo.create).not.toHaveBeenCalled();
  });

  it.each([
    { name: "2DA", year: 1 },
    { name: "Class A", year: 1 },
    { name: "4DA", year: 3 },
  ])("rejects a class name that does not match the year: %j", async (body) => {
    authorizeAdmin();
    const response = await POST(makeRequest("POST", body));
    expect(response.status).toBe(400);
    expect(classRepo.create).not.toHaveBeenCalled();
  });

  it("rejects changing the name without changing the stored year", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(existing as never);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", name: "2DA" }));
    expect(response.status).toBe(400);
    expect(classRepo.update).not.toHaveBeenCalled();
  });

  it("rejects an identical class name on update", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(existing as never);
    vi.mocked(classRepo.hasNameConflict).mockResolvedValueOnce(true);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", name: "1DB" }));
    expect(response.status).toBe(409);
    expect(classRepo.hasNameConflict).toHaveBeenCalledWith("1DB", "item-1");
    expect(classRepo.update).not.toHaveBeenCalled();
  });

  it("allows changing the name and year together", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(existing as never);
    const changed = { id: "item-1", name: "2DA", year: 2 };
    vi.mocked(classRepo.update).mockResolvedValueOnce(changed as never);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", name: "2DA", year: 2 }));
    expect(response.status).toBe(200);
    expect(classRepo.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { name: "2DA", year: 2 },
    });
  });

  it("returns 404 when updating a missing class", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.findById).mockResolvedValueOnce(null);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", name: "1DB" }));
    expect(response.status).toBe(404);
    expect(classRepo.update).not.toHaveBeenCalled();
  });

  it("deletes a class", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.remove).mockResolvedValueOnce(existing as never);
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(200);
    expect(classRepo.remove).toHaveBeenCalledWith({ where: { id: "item-1" } });
    expect(await response.json()).toEqual({ success: true });
  });

  it("rejects deletion of a class in use", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.isInUse).mockResolvedValueOnce(true);
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(409);
    expect(classRepo.isInUse).toHaveBeenCalledWith("item-1");
    expect(classRepo.remove).not.toHaveBeenCalled();
  });

  it.each(["POST", "PATCH", "DELETE"] as const)(
    "rejects malformed JSON for %s",
    async (method) => {
      authorizeAdmin();
      const handler = { POST, PATCH, DELETE }[method];
      const response = await handler(makeInvalidJsonRequest(method));
      expect(response.status).toBe(400);
    },
  );

  it("returns 409 on a duplicate", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.create).mockRejectedValueOnce(prismaError("P2002"));
    const response = await POST(makeRequest("POST", validData));
    expect(response.status).toBe(409);
  });

  it("returns 404 when deleting a missing record", async () => {
    authorizeAdmin();
    vi.mocked(classRepo.remove).mockRejectedValueOnce(prismaError("P2025"));
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(404);
  });
});
