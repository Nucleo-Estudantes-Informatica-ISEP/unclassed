// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import AuthNeiRegistrationLink from "./AuthNeiRegistrationLink";

const signIn = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/link", () => ({
  default: ({
    onNavigate,
    ...props
  }: ComponentProps<"a"> & {
    onNavigate: (event: { preventDefault(): void }) => void;
  }) => <a {...props} onClick={(event) => onNavigate(event)} />,
}));

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.append(container);
  root = createRoot(container);
  signIn.mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test.each([
  [undefined, "/profile", "/register"],
  [
    "/dashboard?a=1&b=2",
    "/dashboard?a=1&b=2",
    "/register?callbackUrl=%2Fdashboard%3Fa%3D1%26b%3D2",
  ],
  ["//other.example", "/profile", "/register"],
  ["https://other.example", "/profile", "/register"],
])("uses a safe return path for %s", async (input, callbackUrl, href) => {
  signIn.mockResolvedValue({ ok: true, url: "#registration" });
  await act(async () =>
    root.render(
      <AuthNeiRegistrationLink callbackUrl={input}>
        Criar conta
      </AuthNeiRegistrationLink>
    )
  );
  const link = container.querySelector("a")!;
  expect(link.getAttribute("href")).toBe(href);
  await act(async () => link.click());

  expect(signIn).toHaveBeenCalledWith(
    "zitadel",
    { callbackUrl, redirect: false },
    { prompt: "create" }
  );
  expect(window.location.hash).toBe("#registration");
  expect(container.querySelector("[role=alert]")).toBeNull();
});

test.each(["refused", "exception"])(
  "shows an in-page error after %s",
  async (failure) => {
    if (failure === "refused")
      signIn.mockResolvedValue({ ok: false, error: "OAuthSignin" });
    else signIn.mockRejectedValue(new Error("Sign-in unavailable"));
    await act(async () =>
      root.render(
        <AuthNeiRegistrationLink>Criar conta</AuthNeiRegistrationLink>
      )
    );
    const link = container.querySelector("a")!;
    const originalLocation = window.location.href;
    await act(async () => link.click());

    expect(container.querySelector("[role=alert]")?.textContent).toContain(
      "Não foi possível iniciar o registo"
    );
    expect(link.getAttribute("aria-busy")).toBe("false");
    expect(window.location.href).toBe(originalLocation);
  }
);
