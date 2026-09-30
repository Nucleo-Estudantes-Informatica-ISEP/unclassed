import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import * as bundleSwapRequestRepository from "@/application/repositories/bundleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";
import * as matchRepository from "@/application/repositories/matchRepository";
import * as singleSwapRequestRepository from "@/application/repositories/singleSwapRequestRepository";

/**
 * GET /api/dashboard/stats
 * Returns actionable stats for dashboard charts
 */
export const GET = defineHandler({
  auth: { rateLimit: "stats" },

  handler: async () => {
    const classes = await classRepo.findClasses();
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const [activeSingle, activeBundle, matches] = await Promise.all([
      singleSwapRequestRepository.findMany({ where: { status: "ACTIVE" } }),
      bundleSwapRequestRepository.findMany({ where: { status: "ACTIVE" } }),
      matchRepository.findMany({
        where: {
          status: { in: ["ACCEPTED", "COMPLETED"] },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const allActive = [...activeSingle, ...activeBundle];
    const intoCounts: Record<string, number> = {};
    for (const req of allActive) {
      for (const classId of req.preferredClassIds) {
        intoCounts[classId] = (intoCounts[classId] || 0) + 1;
      }
    }
    const popularInto = Object.entries(intoCounts)
      .map(([id, count]) => ({ id, name: classMap.get(id) || id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const leaveCounts: Record<string, number> = {};
    for (const req of allActive) {
      leaveCounts[req.currentClassId] =
        (leaveCounts[req.currentClassId] || 0) + 1;
    }
    const popularLeave = Object.entries(leaveCounts)
      .map(([id, count]) => ({ id, name: classMap.get(id) || id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const demandSupply = classes
      .map((c) => {
        const demand = intoCounts[c.id] || 0;
        const supply = leaveCounts[c.id] || 0;
        return {
          id: c.id,
          name: c.name,
          demand,
          supply,
          ratio: supply === 0 ? null : demand / supply,
        };
      })
      .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))
      .slice(0, 10);
    const matchClassStats: Record<
      string,
      { matches: number; totalWait: number; requests: number }
    > = {};
    for (const match of matches) {
      for (const reqId of [
        ...(match.singleSwapRequestIds || []),
        ...(match.bundleSwapRequestIds || []),
      ]) {
        // Find the request
        const req = allActive.find((r) => r.id === reqId);
        if (!req) continue;
        const classId = req.currentClassId;
        if (!matchClassStats[classId])
          matchClassStats[classId] = { matches: 0, totalWait: 0, requests: 0 };
        matchClassStats[classId].matches++;
        matchClassStats[classId].totalWait +=
          new Date(match.createdAt).getTime() -
          new Date(req.createdAt).getTime();
      }
    }
    for (const req of allActive) {
      const classId = req.currentClassId;
      if (!matchClassStats[classId])
        matchClassStats[classId] = { matches: 0, totalWait: 0, requests: 0 };
      matchClassStats[classId].requests++;
    }
    const classSuccessStats = Object.entries(matchClassStats)
      .map(
        ([id, stat]: [
          string,
          { matches: number; totalWait: number; requests: number },
        ]) => ({
          id,
          name: classMap.get(id) || id,
          successRate: stat.requests ? stat.matches / stat.requests : null,
          avgWaitDays: stat.matches
            ? Math.round(stat.totalWait / stat.matches / (1000 * 60 * 60 * 24))
            : null,
        })
      )
      .sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0))
      .slice(0, 10);
    const recentSwaps = matches.map((m: (typeof matches)[number]) => ({
      id: m.id,
      createdAt: m.createdAt,
      classes: [
        ...(m.singleSwapRequestIds || []),
        ...(m.bundleSwapRequestIds || []),
      ].map((reqId: string) => {
        const req = allActive.find((r) => r.id === reqId);
        return req
          ? classMap.get(req.currentClassId) || req.currentClassId
          : reqId;
      }),
    }));
    return NextResponse.json({
      popularInto,
      popularLeave,
      demandSupply,
      classSuccessStats,
      recentSwaps,
    });
  },
});
