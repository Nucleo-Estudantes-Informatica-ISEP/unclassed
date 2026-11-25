# ADR 0002: Extract a pure graph and matching core

Status: Accepted

## Context

Matching requests form a compatibility graph, while finding cycles and scoring swaps are deterministic calculations. Coupling those calculations to Prisma, email, and scheduler code made them harder to test and reuse.

## Decision

Keep the graph contract and storage in [`src/domain/graph/`](../../src/domain/graph/) and compatibility, cycle, scoring, and overlap decisions in [`src/domain/matching/algorithms.ts`](../../src/domain/matching/algorithms.ts). These modules are synchronous and have no Prisma or framework imports. [`MatchingOrchestrator`](../../src/application/matchingOrchestrator.ts) loads requests, maps persistence records to domain inputs, calls the core, and manages match persistence, provisional upgrades, and notifications. Repository adapters stay in [`src/application/repositories/`](../../src/application/repositories/).

## Consequences

Algorithm tests run without MongoDB, and persistence or notification changes do not alter cycle logic. The orchestrator still owns database state checks around matching; pure graph results alone do not reserve requests or commit a match.
