import * as txRepo from "@/application/repositories/transactionRepository";
import * as userIdentityRepo from "@/application/repositories/userIdentityRepository";
import * as userRepo from "@/application/repositories/userRepository";

const AUTH_PROVIDER = "zitadel";

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

async function ensureNoEmailConflict(
  tx: txRepo.Transaction,
  userId: string,
  email: string
) {
  const conflictingUser = await userRepo.findFirst(
    {
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
    },
    tx
  );

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

  return txRepo.executeInTransaction(async (tx) => {
    const existingIdentity = await userIdentityRepo.findUnique(
      {
        where: {
          provider_providerSubject: {
            provider: AUTH_PROVIDER,
            providerSubject: sub,
          },
        },
        include: {
          user: true,
        },
      },
      tx
    );

    if (existingIdentity) {
      await ensureNoEmailConflict(tx, existingIdentity.userId, normalizedEmail);

      return userRepo.update(
        {
          where: { id: existingIdentity.userId },
          data: {
            email: normalizedEmail,
            name: normalizedName,
            ...(resolvedEmailVerified !== null
              ? { emailVerified: resolvedEmailVerified }
              : {}),
          },
        },
        tx
      );
    }

    // First AuthNei/ZITADEL login should attach to an existing local account
    // when the email already exists in Unclassed, even if the IdP account was
    // created later.
    const existingUser = await userRepo.findFirst(
      {
        where: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
      },
      tx
    );

    if (existingUser) {
      await userIdentityRepo.create(
        {
          data: {
            provider: AUTH_PROVIDER,
            providerSubject: sub,
            userId: existingUser.id,
          },
        },
        tx
      );

      return userRepo.update(
        {
          where: { id: existingUser.id },
          data: {
            email: normalizedEmail,
            name: normalizedName,
            ...(resolvedEmailVerified !== null
              ? { emailVerified: resolvedEmailVerified }
              : {}),
          },
        },
        tx
      );
    }

    return userRepo.create(
      {
        data: {
          email: normalizedEmail,
          name: normalizedName,
          emailVerified: true,
          identities: {
            create: {
              provider: AUTH_PROVIDER,
              providerSubject: sub,
            },
          },
        },
      },
      tx
    );
  });
}
