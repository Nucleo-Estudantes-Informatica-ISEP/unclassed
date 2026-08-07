"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/lib/components/ui/form";
import { Label } from "@/lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import { useClasses, useSubjects } from "@/hooks/useApi";
import { ClassRankingSelector } from "@/components/ui/class-ranking-selector";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>();
  const [yearError, setYearError] = useState<string>();
  const router = useRouter();
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
  const currentClassId = form.watch("currentClassId");
  const availableClassOptions = classOptions.filter(
    (option) => option.id !== currentClassId
  );

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedYear) {
      setYearError("Por favor seleciona o ano académico");
      return;
    }

    const isValid = await form.trigger(["subjectId", "currentClassId"], {
      shouldFocus: true,
    });
    if (isValid) onNext();
  };

  const onSubmit = async (data: FormType) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/swap-requests/single", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar pedido de permuta");
      }

      toast.success(
        "Pedido de permuta criado com sucesso! A redirecionar para os matches..."
      );
      form.reset();
      setTimeout(() => router.push("/matches"), 1500);
    } catch (error) {
      console.error("Error creating swap request:", error);
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <div className="space-y-2">
              <Label htmlFor="single-request-year">Ano Académico</Label>
              <Select
                value={selectedYear?.toString() ?? ""}
                onValueChange={(value) => {
                  setSelectedYear(Number(value));
                  setYearError(undefined);
                  form.reset({
                    subjectId: "",
                    currentClassId: "",
                    preferredClassIds: [],
                    preferenceOrderMatters: true,
                  });
                }}
                disabled={subjectsLoading}
              >
                <SelectTrigger id="single-request-year" className="w-full">
                  <SelectValue placeholder="Seleciona o ano académico" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}º Ano
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {yearError && (
                <p
                  className="text-destructive text-sm font-medium"
                  role="alert"
                >
                  {yearError}
                </p>
              )}
            </div>

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

            <FormField
              control={form.control}
              name="currentClassId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma Atual</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue(
                        "preferredClassIds",
                        form
                          .getValues("preferredClassIds")
                          .filter((classId) => classId !== value)
                      );
                    }}
                    value={field.value}
                    disabled={classesLoading || !selectedYear}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleciona a tua turma atual" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes?.map((currentClass) => (
                        <SelectItem
                          key={currentClass.id}
                          value={currentClass.id}
                        >
                          {currentClass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
            <FormField
              control={form.control}
              name="preferredClassIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turmas Preferidas</FormLabel>
                  {classesError ? (
                    <div
                      className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
                      role="alert"
                    >
                      Erro ao carregar turmas: {classesError}
                    </div>
                  ) : classesLoading ? (
                    <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
                      A carregar turmas...
                    </div>
                  ) : classOptions.length === 0 ? (
                    <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
                      Nenhuma turma disponível para este ano.
                    </div>
                  ) : availableClassOptions.length === 0 ? (
                    <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
                      Não há outras turmas disponíveis para trocar.
                    </div>
                  ) : (
                    <FormControl>
                      <ClassRankingSelector
                        options={availableClassOptions}
                        value={field.value}
                        onChange={field.onChange}
                        preferenceOrderMatters={form.watch(
                          "preferenceOrderMatters"
                        )}
                        onPreferenceOrderChange={(orderMatters) =>
                          form.setValue("preferenceOrderMatters", orderMatters)
                        }
                        placeholder="Seleciona as turmas para as quais gostarias de mudar"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
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
