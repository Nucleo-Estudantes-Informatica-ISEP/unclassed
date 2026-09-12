import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";

import * as txRepo from "@/application/repositories/transactionRepository";
import * as userRepo from "@/application/repositories/userRepository";
import * as userIdentityRepo from "@/application/repositories/userIdentityRepository";

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

async function ensureNoEmailConflict(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string
) {
  const conflictingUser = await userRepo.findFirst({
    where: {
      id: {
        not: userId,
      },
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  }, tx);

  if (conflictingUser) {
    throw new Error(
      "Cannot sync OIDC user because the email is already used by another local account."
    );
  }
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
  const resolvedEmailVerified =
    typeof emailVerified === "boolean" ? emailVerified : null;

  if (resolvedEmailVerified !== true) {
    throw new Error("OIDC login requires a verified email address.");
  }

  return txRepo.executeInTransaction(async (tx: Prisma.TransactionClient) => {
    const existingIdentity = await userIdentityRepo.findUnique({
      where: {
        provider_providerSubject: {
          provider: AUTH_PROVIDER,
          providerSubject: sub,
        },
      },
      include: {
        user: true,
      },
    }, tx);

    if (existingIdentity) {
      await ensureNoEmailConflict(tx, existingIdentity.userId, normalizedEmail);

      return userRepo.update({
        where: { id: existingIdentity.userId },
        data: {
          email: normalizedEmail,
          name: normalizedName,
          ...(resolvedEmailVerified !== null
            ? { emailVerified: resolvedEmailVerified }
            : {}),
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      }, tx);
    }

    // First AuthNei/ZITADEL login should attach to an existing local account
    // when the email already exists in Unclassed, even if the IdP account was
    // created later.
    const existingUser = await userRepo.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    }, tx);

    if (existingUser) {
      await userIdentityRepo.create({
        data: {
          provider: AUTH_PROVIDER,
          providerSubject: sub,
          userId: existingUser.id,
        },
      }, tx);

      return userRepo.update({
        where: { id: existingUser.id },
        data: {
          email: normalizedEmail,
          name: normalizedName,
          ...(resolvedEmailVerified !== null
            ? { emailVerified: resolvedEmailVerified }
            : {}),
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      }, tx);
    }

    return userRepo.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        password: buildManagedPassword(sub),
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        identities: {
          create: {
            provider: AUTH_PROVIDER,
            providerSubject: sub,
          },
        },
      },
    }, tx);
  });
}

