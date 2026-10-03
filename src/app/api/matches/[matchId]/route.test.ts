import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import * as apiAccess from "@/lib/apiAccess";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as matchActionService from "@/application/services/matchActionService";

import { GET, PATCH } from "./route";

vi.mock("@/lib/apiAccess", () => ({
  authorizeRequest: vi.fn(),
}));

describe("GET & PATCH /api/matches/[matchId]", () => {
  const params = Promise.resolve({ matchId: "match-123" });

  describe("PATCH /api/matches/[matchId]", () => {
    it("delegates successful actions to the application lifecycle service", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      const updatedMatch = {
        id: "match-123",
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "ACCEPTED",
        isProvisional: false,
        provisionalUntil: null,
        satisfactionScore: null,
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        graphPartition: "internal-partition",
        processingTime: 123,
        participants: [],
      };

      const process = vi
        .spyOn(matchActionService, "processMatchAction")
        .mockResolvedValueOnce({
          updatedMatch,
          message: "Match aceite!",
        } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(
        updatedMatch as never
      );

      try {
        const response = await PATCH(
          new NextRequest("http://localhost:3000/api/matches/match-123", {
            method: "PATCH",
            body: JSON.stringify({ action: "accept" }),
          }),
          { params }
        );

        expect(process).toHaveBeenCalledWith("match-123", "user-1", "accept");

        expect(response.status).toBe(200);

        const json = await response.json();

        expect(json).toEqual({
          success: true,
          match: expect.objectContaining({
            id: "match-123",
            matchType: "SINGLE",
            swapPattern: "DIRECT",
            status: "ACCEPTED",
            isProvisional: false,
            provisionalUntil: null,
            satisfactionScore: null,
            singleSwapRequestIds: [],
            bundleSwapRequestIds: [],
            participants: [],
          }),
          message: "Match aceite!",
        });

        // Internal Match fields must not be exposed.
        expect(json.match.graphPartition).toBeUndefined();
        expect(json.match.processingTime).toBeUndefined();
      } finally {
        process.mockRestore();
      }
    });

    it("returns 404 when match is not found", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(null);

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123",
        {
          method: "PATCH",
          body: JSON.stringify({ action: "accept" }),
        }
      );

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

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123",
        {
          method: "PATCH",
          body: JSON.stringify({ action: "accept" }),
        }
      );

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

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123",
        {
          method: "PATCH",
          body: JSON.stringify({ action: "accept" }),
        }
      );

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

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123",
        {
          method: "PATCH",
          body: JSON.stringify({ action: "invalid-action" }),
        }
      );

      const res = await PATCH(req, { params });

      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json).toEqual({ error: "Ação inválida" });
    });

    it("returns the public DTO without internal match fields on success", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchActionService, "processMatchAction").mockResolvedValueOnce({
        updatedMatch: {
          id: "match-123",
          participants: [],
        },
        message: "Match aceite com sucesso",
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-123",
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "ACCEPTED",
        isProvisional: false,
        provisionalUntil: null,
        satisfactionScore: null,
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        graphPartition: "internal-partition",
        processingTime: 123,
        participants: [
          {
            userId: "user-1",
            fromClass: "class-1",
            toClass: "class-2",
            requestId: "request-1",
            requestType: "single",
            satisfactionScore: 5,
            status: "accepted",
          },
        ],
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123",
        {
          method: "PATCH",
          body: JSON.stringify({ action: "accept" }),
        }
      );

      const res = await PATCH(req, { params });

      expect(res.status).toBe(200);

      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.message).toBe("Match aceite com sucesso");

      expect(json.match.id).toBe("match-123");
      expect(json.match.status).toBe("ACCEPTED");

      // Internal Match fields must not be exposed.
      expect(json.match.graphPartition).toBeUndefined();
      expect(json.match.processingTime).toBeUndefined();
    });
  });

  describe("GET /api/matches/[matchId]", () => {
    it("returns 404 when match is not found", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(null);

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123"
      );

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
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        satisfactionScore: null,
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        graphPartition: "part-1",
        participants: [
          {
            userId: "user-1",
            fromClass: "class-1",
            toClass: "class-2",
            requestId: "request-1",
            requestType: "single",
            satisfactionScore: 5,
            status: "pending",
          },
        ],
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123"
      );

      const res = await GET(req, { params });

      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json).toEqual({ error: "Acesso negado" });
    });

    it("returns 200 when user is a participant", async () => {
      const matchData = {
        id: "match-123",
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        satisfactionScore: null,
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        graphPartition: "part-1",
        participants: [
          {
            userId: "user-1",
            fromClass: "class-1",
            toClass: "class-2",
            requestId: "request-1",
            requestType: "single",
            satisfactionScore: 5,
            status: "pending",
          },
        ],
      };

      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(
        matchData as never
      );

      const req = new NextRequest(
        "http://localhost:3000/api/matches/match-123"
      );

      const res = await GET(req, { params });

      expect(res.status).toBe(200);

      const json = await res.json();

      expect(json.id).toBe("match-123");
      expect(json.matchType).toBe("SINGLE");
      expect(json.swapPattern).toBe("DIRECT");

      // Internal Match fields must not be exposed.
      expect(json.graphPartition).toBeUndefined();
    });
  });
});
