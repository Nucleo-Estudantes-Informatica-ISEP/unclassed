import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiAccess", () => ({
  authorizeRequest: vi.fn(),
}));

import * as apiAccess from "@/lib/apiAccess";
import * as matchRepo from "@/application/repositories/matchRepository";
import { GET, PATCH } from "./route";

describe("GET & PATCH /api/matches/[matchId]", () => {
  const params = Promise.resolve({ matchId: "match-123" });

  describe("PATCH /api/matches/[matchId]", () => {
    it("returns 404 when match is not found", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123", {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ error: "Match não encontrado" });
    });

    it("returns 403 when user is not a participant in the match", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "intruder-user", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-123",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-1", status: "pending" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123", {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: "Acesso negado" });
    });

    it("returns 409 when match action is disallowed by rules", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-123",
        status: "COMPLETED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-1", status: "completed" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123", {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 400 when body has invalid action", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123", {
        method: "PATCH",
        body: JSON.stringify({ action: "invalid-action" }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "Ação inválida" });
    });
  });

  describe("GET /api/matches/[matchId]", () => {
    it("returns 404 when match is not found", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123");
      const res = await GET(req, { params });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ error: "Match não encontrado" });
    });

    it("returns 403 when user is not a participant and not admin", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "intruder-user", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-123",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-1", status: "pending" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123");
      const res = await GET(req, { params });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: "Acesso negado" });
    });

    it("returns 200 when user is a participant", async () => {
      const matchData = {
        id: "match-123",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-1", status: "pending" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      };

      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(matchData as never);

      const req = new NextRequest("http://localhost:3000/api/matches/match-123");
      const res = await GET(req, { params });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("match-123");
    });
  });
});
