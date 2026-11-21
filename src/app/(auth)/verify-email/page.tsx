import {
  EMAIL_VERIFICATION_COOKIE,
  readEmailVerificationRecovery,
} from "@/lib/email-verification-recovery";
import { cookies } from "next/headers";
import Link from "next/link";
import { ResumeEmailVerification } from "./resume";

export default async function VerifyEmailPage() {
  const jar = await cookies();
  const state = readEmailVerificationRecovery(jar.get(EMAIL_VERIFICATION_COOKIE)?.value);
  const login = "/login?callbackUrl=" + encodeURIComponent(state?.destination ?? "/dashboard");

  return (
    <section className="mx-auto flex min-h-[36rem] max-w-sm flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-3xl font-bold">Verifica o teu email</h1>
      <p className="text-muted-foreground text-sm leading-6">
        O Unclassed precisa de um endereço de email verificado. Conclui a
        verificação no AuthNEI para regressares ao Unclassed.
      </p>
      {state && !state.attempted ? <ResumeEmailVerification /> : (
        <Link className="text-primary font-medium underline" href={login}>
          Voltar ao início de sessão
        </Link>
      )}
    </section>
  );
}
