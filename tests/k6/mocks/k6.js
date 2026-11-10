import { vi } from "vitest";

export const sleep = vi.fn();
export const check = vi.fn();
export const http = { post: vi.fn(), del: vi.fn(), get: vi.fn() };
export default http;
export class Rate {
  add() {}
}
