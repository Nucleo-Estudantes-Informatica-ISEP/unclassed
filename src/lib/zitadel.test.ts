import { beforeEach, expect, test, vi } from "vitest";

import { env } from "./env";
import { buildZitadelLogoutUrl } from "./zitadel";

vi.mock("./env", () => ({ env: {} }));

beforeEach(() => {
  env.APP_BASE_URL = "https://app.example.test";
  env.AUTH_ISSUER_URL = "https://identity.example.test";
  env.AUTH_CLIENT_ID = "fixture-client";
  env.AUTH_POST_LOGOUT_REDIRECT_URI = "https://app.example.test/signed-out";
});

test("logout sends only the client ID and registered app return location", () => {
  const url = new URL(buildZitadelLogoutUrl());
  expect(url.origin + url.pathname).toBe(
    "https://identity.example.test/oidc/v1/end_session"
  );
  expect(Object.fromEntries(url.searchParams)).toEqual({
    client_id: "fixture-client",
    post_logout_redirect_uri: "https://app.example.test/signed-out",
  });
});

test("logout ignores a configured return URL outside the application origin", () => {
  env.AUTH_POST_LOGOUT_REDIRECT_URI = "https://elsewhere.example.test";
  expect(
    new URL(buildZitadelLogoutUrl()).searchParams.get(
      "post_logout_redirect_uri"
    )
  ).toBe("https://app.example.test/");
  env.AUTH_ISSUER_URL = undefined;
  expect(buildZitadelLogoutUrl()).toBe("https://app.example.test/");
});
