// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import UserMenu from "./UserMenu";

const { get, signOut, notifyError } = vi.hoisted(() => ({
  get: vi.fn(),
  signOut: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ signOut }));
vi.mock("@/lib/httpClient", () => ({ httpClient: { get } }));
vi.mock("@/lib/client-auth-actions", () => ({ switchAuthNeiAccount: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: notifyError } }));

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <UserMenu
        user={{
          name: "Fixture Student",
          email: "student@example.test",
          role: "USER",
        }}
      />
    )
  );
  await act(async () =>
    container
      .querySelector("button[aria-label='Menu da conta']")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const button = (label: string) =>
  [...container.querySelectorAll("button")].find(
    (entry) => entry.textContent === label
  )!;

test("app-only sign-out never fetches the AuthNEI logout URL", async () => {
  await act(async () => button("Terminar sessão só nesta aplicação").click());
  expect(signOut).toHaveBeenCalledWith({ redirect: false });
  expect(get).not.toHaveBeenCalled();
});

test("keeps the app session when shared sign-out preparation fails", async () => {
  get.mockRejectedValue(new Error("Issuer unavailable"));
  const shared = button("Terminar sessão nesta aplicação e no AuthNEI");
  await act(async () => shared.click());

  expect(get).toHaveBeenCalledWith("/api/logout-url", { cache: "no-store" });
  expect(signOut).not.toHaveBeenCalled();
  expect(notifyError).toHaveBeenCalledOnce();
  expect(shared.disabled).toBe(false);
});
