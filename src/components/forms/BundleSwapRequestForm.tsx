"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/lib/components/ui/form";
import { useClasses } from "@/hooks/useApi";
import { useSwapRequestWizardForm } from "@/hooks/useSwapRequestWizardForm";
import {
  CurrentClassField,
  PreferredClassesField,
  YearSelect,
} from "@/components/forms/swapRequestFields";
import { WizardNavigation } from "@/components/ui/step-wizard";
import {
  bundleSwapRequestSchema,
  type BundleSwapRequestForm as FormType,
} from "@/schemas/swapRequestSchema";

interface BundleSwapRequestFormProps {
  step: "details" | "preferences";
  onBack: () => void;
  onNext: () => void;
}

export default function BundleSwapRequestForm({
  step,
  onBack,
  onNext,
}: BundleSwapRequestFormProps) {
  const form = useForm<FormType>({
    resolver: zodResolver(bundleSwapRequestSchema),
    defaultValues: {
      currentClassId: "",
      preferredClassIds: [],
      preferenceOrderMatters: true,
    },
  });

  const {
    isSubmitting,
    selectedYear,
    setSelectedYear,
    yearError,
    setYearError,
    handleDetailsSubmit,
    onSubmit,
  } = useSwapRequestWizardForm({
    form,
    endpoint: "/api/swap-requests/bundle",
    successMessage:
      "Pedido de permuta completa criado com sucesso! A redirecionar para os matches...",
    errorLogLabel: "Error creating bundle swap request:",
    detailFields: "currentClassId",
    onNext,
  });

  // Bundle-swap has no subjects endpoint to derive the "years" list from, so
  // unlike SingleSwapRequestForm it fetches every class up front and filters
  // by year client-side (both for the year options and the class picker)
  // instead of re-fetching per year. The class list is small enough that this
  // isn't a real cost, and it avoids a chicken-and-egg fetch (you'd need a
  // year to fetch classes server-side filtered, but need the classes to know
  // which years exist).
  const {
    data: allClasses,
    loading: classesLoading,
    error: classesError,
  } = useClasses();

  const classes =
    allClasses?.filter((currentClass) => currentClass.year === selectedYear) ??
    [];
  const years = allClasses
    ? Array.from(
        new Set(allClasses.map((currentClass) => currentClass.year))
      ).sort()
    : [];
  const classOptions = classes.map((currentClass) => ({
    id: currentClass.id,
    name: currentClass.name,
  }));
  const currentClassId = useWatch({ control: form.control, name: "currentClassId" });
  const availableClassOptions = classOptions.filter(
    (option) => option.id !== currentClassId
  );

  return (
    <Form {...form}>
      <form
        onSubmit={
          step === "details" ? handleDetailsSubmit : form.handleSubmit(onSubmit)
        }
        className="space-y-6"
      >
        {step === "details" ? (
          <>
            {classesError && (
              <div
                className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
                role="alert"
              >
                Erro ao carregar turmas: {classesError}
              </div>
            )}

            <YearSelect
              id="bundle-request-year"
              years={years}
              value={selectedYear}
              disabled={classesLoading}
              error={yearError}
              onChange={(year) => {
                setSelectedYear(year);
                setYearError(undefined);
                form.reset({
                  currentClassId: "",
                  preferredClassIds: [],
                  preferenceOrderMatters: true,
                });
              }}
            />

            <CurrentClassField
              form={form}
              classes={classes}
              disabled={classesLoading || !selectedYear}
            />

            <WizardNavigation
              onBack={onBack}
              nextLabel="Continuar"
              nextDisabled={classesLoading || Boolean(classesError)}
              submit
            />
          </>
        ) : (
          <>
            <PreferredClassesField
              form={form}
              classOptions={classOptions}
              availableClassOptions={availableClassOptions}
              loading={classesLoading}
              error={classesError}
            />

            <WizardNavigation
              onBack={onBack}
              nextLabel="Criar pedido completo"
              nextDisabled={classesLoading || Boolean(classesError)}
              isSubmitting={isSubmitting}
              submit
            />
          </>
        )}
      </form>
    </Form>
  );
}
