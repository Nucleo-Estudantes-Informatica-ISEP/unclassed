"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";

export interface SwapRequestFormBase {
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters: boolean;
}

interface UseSwapRequestWizardFormOptions<T extends FieldValues & SwapRequestFormBase> {
  form: UseFormReturn<T>;
  endpoint: string;
  successMessage: string;
  errorLogLabel: string;
  detailFields: FieldPath<T> | readonly FieldPath<T>[];
  onNext: () => void;
}

/**
 * Shared details/preferences wizard-step behavior for the single- and
 * bundle-swap forms: year selection state, the "validate details step then
 * advance" handler, and the create-request submit flow. Each form still owns
 * its own schema, endpoint, and which extra fields (e.g. subjectId) it
 * validates before advancing — this hook only factors out what's identical.
 */
export function useSwapRequestWizardForm<T extends FieldValues & SwapRequestFormBase>({
  form,
  endpoint,
  successMessage,
  errorLogLabel,
  detailFields,
  onNext,
}: UseSwapRequestWizardFormOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>();
  const [yearError, setYearError] = useState<string>();
  const router = useRouter();

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedYear) {
      setYearError("Por favor seleciona o ano académico");
      return;
    }

    const isValid = await form.trigger(detailFields, { shouldFocus: true });
    if (isValid) onNext();
  };

  const onSubmit = async (data: T) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar pedido de permuta");
      }

      toast.success(successMessage);
      form.reset();
      const requestType = endpoint.includes("/bundle") ? "bundle" : "single";
      setTimeout(
        () =>
          router.push(
            `/swap-requests?type=${requestType}&requestId=${result.id}`
          ),
        1200
      );
    } catch (error) {
      console.error(errorLogLabel, error);
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    selectedYear,
    setSelectedYear,
    yearError,
    setYearError,
    handleDetailsSubmit,
    onSubmit,
  };
}
