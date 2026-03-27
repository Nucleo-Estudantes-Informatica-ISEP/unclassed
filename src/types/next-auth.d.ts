import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      zitadelSub: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    idTokenHint?: string;
    localUserId?: string;
    role?: "USER" | "ADMIN";
    zitadelSub?: string;
  }
}
