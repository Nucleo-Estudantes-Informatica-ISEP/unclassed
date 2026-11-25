// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import Login from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/httpClient", () => ({
  httpClient: { get: async () => ({ configured: true }) },
}));
vi.mock("./start-sign-in", () => ({
  startSignIn: async () => "#issuer",
}));

test("allows restarting sign-in when the login page is restored", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Login />));
    const button = container.querySelector("button")!;
    expect(button.disabled).toBe(false);

    await act(async () => button.click());
    expect(button.disabled).toBe(true);

    await act(async () => window.dispatchEvent(new Event("pageshow")));
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain("Continuar para o login");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
