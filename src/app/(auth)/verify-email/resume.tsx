"use client";

import { useActionState, useEffect, useRef } from "react";
import { resumeEmailVerification } from "./actions";

export function ResumeEmailVerification() {
  const [failed, action, pending] = useActionState(resumeEmailVerification, false);
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      form.current?.requestSubmit();
    }
  }, []);

  return (
    <form ref={form} action={action}>
      {failed && (
        <p role="alert" className="text-destructive mb-2 text-sm">
          Não foi possível abrir a verificação no AuthNEI. Tenta novamente.
        </p>
      )}
      <button className="text-primary font-medium underline" type="submit" disabled={pending}>
        {failed ? "Tentar novamente" : "Continuar para verificar o email"}
      </button>
    </form>
  );
}
