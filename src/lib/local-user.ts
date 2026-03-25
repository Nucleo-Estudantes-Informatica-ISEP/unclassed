import crypto from "node:crypto";

import prisma from "@/lib/prisma";

const AUTH_PROVIDER = "zitadel";
const OIDC_PASSWORD_PREFIX = "__OIDC_MANAGED__";

type SyncOidcUserInput = {
  sub: string;
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

function normalizeName(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (email) {
    return email.split("@")[0];
  }

  return "Utilizador";
}

function buildManagedPassword(sub: string) {
  const digest = crypto.createHash("sha256").update(sub).digest("hex");
  return `${OIDC_PASSWORD_PREFIX}:${digest}`;
}

export async function syncLocalUserFromOidc({
  sub,
  email,
  name,
  emailVerified,
}: SyncOidcUserInput) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("OIDC login did not include an email claim.");
  }

  const normalizedName = normalizeName(name, normalizedEmail);
  const isEmailVerified = Boolean(emailVerified);

  return prisma.$transaction(async (tx) => {
    const existingIdentity = await tx.userIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AUTH_PROVIDER,
          providerSubject: sub,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingIdentity) {
      return tx.user.update({
        where: { id: existingIdentity.userId },
        data: {
          email: normalizedEmail,
          name: normalizedName,
          emailVerified: isEmailVerified,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    }

    // First AuthNei/ZITADEL login should attach to an existing local account
    // when the email already exists in Unclassed, even if the IdP account was
    // created later.
    const existingUser = await tx.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (existingUser) {
      await tx.userIdentity.create({
        data: {
          provider: AUTH_PROVIDER,
          providerSubject: sub,
          userId: existingUser.id,
        },
      });

      return tx.user.update({
        where: { id: existingUser.id },
        data: {
          email: normalizedEmail,
          name: normalizedName,
          emailVerified: isEmailVerified,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    }

    return tx.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        password: buildManagedPassword(sub),
        emailVerified: isEmailVerified,
        verificationToken: null,
        verificationTokenExpiry: null,
        identities: {
          create: {
            provider: AUTH_PROVIDER,
            providerSubject: sub,
          },
        },
      },
    });
  });
}
