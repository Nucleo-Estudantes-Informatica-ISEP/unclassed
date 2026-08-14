"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/lib/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import { useClasses, useSubjects } from "@/hooks/useApi";
import { useSwapRequestWizardForm } from "@/hooks/useSwapRequestWizardForm";
import {
  CurrentClassField,
  PreferredClassesField,
  YearSelect,
} from "@/components/forms/swapRequestFields";
import { WizardNavigation } from "@/components/ui/step-wizard";
import {
  singleSwapRequestSchema,
  type SingleSwapRequestForm as FormType,
} from "@/schemas/swapRequestSchema";

interface SingleSwapRequestFormProps {
  step: "details" | "preferences";
  onBack: () => void;
  onNext: () => void;
}

export default function SingleSwapRequestForm({
  step,
  onBack,
  onNext,
}: SingleSwapRequestFormProps) {
  const form = useForm<FormType>({
    resolver: zodResolver(singleSwapRequestSchema),
    defaultValues: {
      subjectId: "",
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
    endpoint: "/api/swap-requests/single",
    successMessage:
      "Pedido de permuta criado com sucesso! A redirecionar para os matches...",
    errorLogLabel: "Error creating swap request:",
    detailFields: ["subjectId", "currentClassId"],
    onNext,
  });

  // Single-swap has a separate, always-unfiltered "years" source (subjects),
  // so the class list itself can be fetched pre-filtered server-side once a
  // year is picked. Bundle has no subjects endpoint to lean on, so it fetches
  // all classes and filters client-side instead — see BundleSwapRequestForm.
  const {
    data: subjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useSubjects();
  const {
    data: classes,
    loading: classesLoading,
    error: classesError,
  } = useClasses(selectedYear);

  const years = subjects
    ? Array.from(new Set(subjects.map((subject) => subject.year))).sort()
    : [];
  const filteredSubjects =
    subjects?.filter((subject) => subject.year === selectedYear) ?? [];
  const classOptions =
    classes?.map((currentClass) => ({
      id: currentClass.id,
      name: currentClass.name,
    })) ?? [];
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
            {(subjectsError || classesError) && (
              <div
                className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
                role="alert"
              >
                Erro ao carregar dados: {subjectsError || classesError}
              </div>
            )}

            <YearSelect
              id="single-request-year"
              years={years}
              value={selectedYear}
              disabled={subjectsLoading}
              error={yearError}
              onChange={(year) => {
                setSelectedYear(year);
                setYearError(undefined);
                form.reset({
                  subjectId: "",
                  currentClassId: "",
                  preferredClassIds: [],
                  preferenceOrderMatters: true,
                });
              }}
            />

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disciplina</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={subjectsLoading || !selectedYear}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleciona a disciplina" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CurrentClassField
              form={form}
              classes={classOptions}
              disabled={classesLoading || !selectedYear}
            />

            <WizardNavigation
              onBack={onBack}
              nextLabel="Continuar"
              nextDisabled={
                subjectsLoading ||
                classesLoading ||
                Boolean(subjectsError || classesError)
              }
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
              nextLabel="Criar pedido"
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
