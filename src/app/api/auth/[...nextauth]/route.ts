import { defineHandler } from "@/lib/defineHandler";
import { handlers } from "@/auth";

// NextAuth owns OIDC callbacks, CSRF and session issuance.
export const GET = defineHandler({
  auth: false,
  handler: ({ request }) => handlers.GET(request),
});
export const POST = defineHandler({
  auth: false,
  handler: ({ request }) => handlers.POST(request),
});
