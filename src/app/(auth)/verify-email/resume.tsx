"use client";

import { useEffect, useRef } from "react";
import { resumeEmailVerification } from "./actions";

export function ResumeEmailVerification() {
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      form.current?.requestSubmit();
    }
  }, []);

  return (
    <form ref={form} action={resumeEmailVerification}>
      <button className="text-primary font-medium underline" type="submit">
        Continuar para verificar o email
      </button>
    </form>
  );
}
