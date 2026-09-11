import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiAccess", () => ({
  authorizeRequest: vi.fn(),
}));

import * as apiAccess from "@/lib/apiAccess";
import * as SwapRequestService from "@/application/services/swapRequestService";
import {
  SwapRequestForbiddenError,
  SwapRequestNotFoundError,
} from "@/application/services/swapRequestService";

import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";

import {
  handleCreateSwapRequest,
  handleDeleteSwapRequest,
  handleGetSwapRequestById,
  handleGetSwapRequests,
  handleUpdateSwapRequest,
} from "./handlers";

describe("swap-requests HTTP handlers", () => {
  describe("handleGetSwapRequests", () => {
    it("returns 401 when authorizeRequest fails", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: false,
        response: new Response("Unauthorized", { status: 401 }) as never,
      });

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single");
      const res = await handleGetSwapRequests(req, "single");
      expect(res.status).toBe(401);
    });

    it("delegates listSwapRequests to use case and returns 200", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      const listSpy = vi
        .spyOn(SwapRequestService, "listSwapRequests")
        .mockResolvedValueOnce([
          {
            id: "req-1",
            userId: "user-1",
            subjectId: "sub-1",
            currentClassId: "c1",
            preferredClassIds: ["c2"],
            preferenceOrderMatters: true,
            ticketType: "SPECIFIC_CLASS",
            status: "ACTIVE",
            priority: 1,
            satisfactionScore: null,
            provisionalUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: "user-1", name: "User", email: "user@example.com" },
            subject: { id: "sub-1", code: "PROG", name: "Prog", year: 1 },
            currentClass: { id: "c1", name: "LEI11", year: 1 },
            preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }],
          },
        ] as never);

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single");
      const res = await handleGetSwapRequests(req, "single");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(listSpy).toHaveBeenCalledWith({
        session: { id: "user-1", role: "USER" },
        queryUserId: null,
        queryStatus: null,
        repo: singleSwapRequestRepo,
      });
    });
  });

  describe("handleCreateSwapRequest", () => {
    it("creates single swap request via use case and returns 201", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(SwapRequestService, "createSingleSwapRequest").mockResolvedValueOnce({
        id: "sr-1",
        userId: "user-1",
        subjectId: "sub-1",
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
        ticketType: "SPECIFIC_CLASS",
        status: "ACTIVE",
        priority: 1,
        satisfactionScore: null,
        provisionalUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "User", email: "user@example.com" },
        subject: { id: "sub-1", code: "PROG", name: "Prog", year: 1 },
        currentClass: { id: "c1", name: "LEI11", year: 1 },
        preferredClasses: [],
      } as never);

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single", {
        method: "POST",
        body: JSON.stringify({
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }),
      });

      const res = await handleCreateSwapRequest(req, "single");
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("sr-1");
      expect(json.message).toBe("Pedido criado com sucesso! A procurar matches imediatos...");
    });

    it("creates bundle swap request via use case and returns 201", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(SwapRequestService, "createBundleSwapRequest").mockResolvedValueOnce({
        id: "br-1",
        userId: "user-1",
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
        ticketType: "ALL_CLASSES",
        status: "ACTIVE",
        priority: 1,
        satisfactionScore: null,
        provisionalUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "User", email: "user@example.com" },
        currentClass: { id: "c1", name: "LEI11", year: 1 },
        preferredClasses: [],
      } as never);

      const req = new NextRequest("http://localhost:3000/api/swap-requests/bundle", {
        method: "POST",
        body: JSON.stringify({
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }),
      });

      const res = await handleCreateSwapRequest(req, "bundle");
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("br-1");
      expect(json.message).toBe(
        "Pedido de permuta completa criado! A procurar matches imediatos..."
      );
    });
  });

  describe("handleGetSwapRequestById", () => {
    const context = { params: Promise.resolve({ id: "req-1" }) };

    it("returns 404 when use case throws NotFoundError", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(SwapRequestService, "getSwapRequestById").mockRejectedValueOnce(
        new SwapRequestNotFoundError()
      );

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single/req-1");
      const res = await handleGetSwapRequestById(req, context, "single");
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Pedido de permuta não encontrado");
    });
  });

  describe("handleUpdateSwapRequest", () => {
    const context = { params: Promise.resolve({ id: "req-1" }) };

    it("returns 403 when use case throws ForbiddenError", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(SwapRequestService, "cancelSwapRequest").mockRejectedValueOnce(
        new SwapRequestForbiddenError()
      );

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single/req-1", {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const res = await handleUpdateSwapRequest(req, context, "single");
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Acesso proibido a este pedido de permuta");
    });
  });

  describe("handleDeleteSwapRequest", () => {
    const context = { params: Promise.resolve({ id: "req-1" }) };

    it("returns 200 with delete message when successful", async () => {
      vi.mocked(apiAccess.authorizeRequest).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "USER" },
      } as never);

      vi.spyOn(SwapRequestService, "deleteSwapRequest").mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/swap-requests/single/req-1", {
        method: "DELETE",
      });

      const res = await handleDeleteSwapRequest(req, context, "single");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Pedido de permuta eliminado com sucesso");
    });
  });
});
