import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/application/repositories/subjectRepository", () => ({
  findSubjects: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  isInUse: vi.fn(),
}));

import * as subjectRepo from "@/application/repositories/subjectRepository";
import { authorizeRequest } from "@/lib/apiAccess";
import { GET, POST, PATCH, DELETE } from "./route";

const apiUrl = "http://localhost:3000/api/subjects";
const validData = { code: "ALG", name: "Algebra", year: 1, semester: 1 };
const existing = { id: "item-1", code: "ALG", name: "Algebra", year: 1, semester: 1 };
const patchData = { name: "Linear Algebra" };
const updated = { id: "item-1", code: "ALG", name: "Linear Algebra", year: 1, semester: 1 };

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

describe("/api/subjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(subjectRepo.isInUse).mockResolvedValue(false);
  });

  it("returns data for authenticated GET", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.findSubjects).mockResolvedValueOnce([existing] as never);
    const response = await GET(new NextRequest(apiUrl));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([existing]);
  });

  it("filters subjects by year and semester", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.findSubjects).mockResolvedValueOnce([]);
    const request = new NextRequest(`${apiUrl}?year=1&semester=2`);
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(subjectRepo.findSubjects).toHaveBeenCalledWith({ year: 1, semester: 2 });
  });

  it.each(["year=0", "year=4", "year=abc", "semester=0", "semester=3", "semester=1.5"])(
    "rejects invalid subject filter %s",
    async (filter) => {
      authorizeAdmin();
      const response = await GET(new NextRequest(`${apiUrl}?${filter}`));
      expect(response.status).toBe(400);
      expect(subjectRepo.findSubjects).not.toHaveBeenCalled();
    },
  );

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

  it("creates a subject", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.create).mockResolvedValueOnce(existing as never);
    const response = await POST(makeRequest("POST", validData));
    expect(response.status).toBe(201);
    expect(subjectRepo.create).toHaveBeenCalledWith({ data: validData });
    expect(await response.json()).toEqual(existing);
  });

  it("rejects invalid creation data", async () => {
    authorizeAdmin();
    const response = await POST(makeRequest("POST", { ...validData, year: 4 }));
    expect(response.status).toBe(400);
    expect(subjectRepo.create).not.toHaveBeenCalled();
  });

  it("updates a subject", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.update).mockResolvedValueOnce(updated as never);
    const response = await PATCH(makeRequest("PATCH", { id: "item-1", ...patchData }));
    expect(response.status).toBe(200);
    expect(subjectRepo.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: patchData,
    });
    expect(await response.json()).toEqual(updated);
  });

  it("rejects an update without fields", async () => {
    authorizeAdmin();
    const response = await PATCH(makeRequest("PATCH", { id: "item-1" }));
    expect(response.status).toBe(400);
    expect(subjectRepo.update).not.toHaveBeenCalled();
  });

  it("deletes a subject", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.remove).mockResolvedValueOnce(existing as never);
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(200);
    expect(subjectRepo.remove).toHaveBeenCalledWith({ where: { id: "item-1" } });
    expect(await response.json()).toEqual({ success: true });
  });

  it("rejects deletion of a subject in use", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.isInUse).mockResolvedValueOnce(true);
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(409);
    expect(subjectRepo.isInUse).toHaveBeenCalledWith("item-1");
    expect(subjectRepo.remove).not.toHaveBeenCalled();
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
    vi.mocked(subjectRepo.create).mockRejectedValueOnce(prismaError("P2002"));
    const response = await POST(makeRequest("POST", validData));
    expect(response.status).toBe(409);
  });

  it("returns 404 when deleting a missing record", async () => {
    authorizeAdmin();
    vi.mocked(subjectRepo.remove).mockRejectedValueOnce(prismaError("P2025"));
    const response = await DELETE(makeRequest("DELETE", { id: "item-1" }));
    expect(response.status).toBe(404);
  });
});
