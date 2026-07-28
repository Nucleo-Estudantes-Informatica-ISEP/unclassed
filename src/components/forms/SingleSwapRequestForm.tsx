"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/lib/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { ClassRankingSelector } from "@/components/ui/class-ranking-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";

import { singleSwapRequestSchema, SingleSwapRequestForm as FormType } from "@/schemas/swapRequestSchema";
import { useSubjects, useClasses } from "@/hooks/useApi";

interface SingleSwapRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SingleSwapRequestForm({ onSuccess, onCancel }: SingleSwapRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const router = useRouter();

  const form = useForm<FormType>({
    resolver: zodResolver(singleSwapRequestSchema),
    defaultValues: {
      preferredClassIds: [],
      preferenceOrderMatters: true,
    },
  });

  const { data: subjects, loading: subjectsLoading, error: subjectsError } = useSubjects();
  const { data: classes, loading: classesLoading, error: classesError } = useClasses(selectedYear);

  // Get unique years from subjects
  const years = subjects ? Array.from(new Set(subjects.map((s) => s.year))).sort() : [];

  // Filter subjects by selected year
  const filteredSubjects = subjects?.filter((s) => (selectedYear ? s.year === selectedYear : true)) || [];

  // Convert classes to options for ClassRankingSelector
  const classOptions =
    classes?.map((cls) => ({
      id: cls.id,
      name: cls.name,
    })) || [];

  const onSubmit = async (data: FormType) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/swap-requests/single", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar pedido de permuta");
      }

      toast.success("Pedido de permuta criado com sucesso! Redirecionando para os matches...");
      form.reset();

      // Redirect to matches page after a short delay to show the toast
      setTimeout(() => {
        router.push("/matches");
      }, 1500);

      onSuccess?.();
    } catch (error) {
      console.error("Error creating swap request:", error);
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentClassId = form.watch("currentClassId");
  const availableClassOptions = classOptions.filter((option) => option.id !== currentClassId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Criar Pedido de Permuta Individual</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano Académico</label>
              <Select
                value={selectedYear?.toString() || ""}
                onValueChange={(value) => {
                  const parsed = value ? parseInt(value, 10) : undefined;
                  setSelectedYear(parsed);
                  // Reset form when year changes, including currentClassId and subjectId
                  form.reset({
                    subjectId: undefined,
                    currentClassId: undefined,
                    preferredClassIds: [],
                    preferenceOrderMatters: true,
                  });
                }}
              >
                <SelectTrigger className="w-full">
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
            </div>

            {/* Subject Selection */}
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disciplina</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={subjectsLoading}>
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

            {/* Current Class Selection */}
            <FormField
              control={form.control}
              name="currentClassId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma Atual</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading || !selectedYear}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleciona a tua turma atual" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Classes Selection */}
            <FormField
              control={form.control}
              name="preferredClassIds"
              render={({ field }) => {
                // Show error message if needed
                if (classesError) {
                  return (
                    <FormItem>
                      <FormLabel>Turmas Preferidas</FormLabel>
                      <div className="text-center py-8 text-red-600 border-2 border-red-200 rounded-lg">
                        <p>Erro ao carregar turmas: {classesError}</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }

                // Show loading state
                if (classesLoading) {
                  return (
                    <FormItem>
                      <FormLabel>Turmas Preferidas</FormLabel>
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>A carregar turmas...</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }

                // Show no year selected message
                if (!selectedYear) {
                  return (
                    <FormItem>
                      <FormLabel>Turmas Preferidas</FormLabel>
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>Por favor seleciona um ano académico primeiro.</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }

                // Show no classes available message
                if (classOptions.length === 0) {
                  return (
                    <FormItem>
                      <FormLabel>Turmas Preferidas</FormLabel>
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>Nenhuma turma disponível para este ano.</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }

                // Show no other classes message
                if (currentClassId && availableClassOptions.length === 0) {
                  return (
                    <FormItem>
                      <FormLabel>Turmas Preferidas</FormLabel>
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>Não há outras turmas disponíveis para trocar.</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }

                return (
                  <FormItem>
                    <FormLabel>Turmas Preferidas</FormLabel>
                    <FormControl>
                      <ClassRankingSelector
                        options={currentClassId ? availableClassOptions : classOptions}
                        value={field.value || []}
                        onChange={field.onChange}
                        preferenceOrderMatters={form.watch("preferenceOrderMatters")}
                        onPreferenceOrderChange={(orderMatters) => {
                          form.setValue("preferenceOrderMatters", orderMatters);
                        }}
                        disabled={classesLoading || !selectedYear}
                        placeholder="Seleciona as turmas para as quais gostarias de mudar"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting || subjectsLoading || classesLoading} className="flex-1 h-11 shadow-lg shadow-primary/20">
                {isSubmitting ? "A criar..." : "Criar Pedido"}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none h-11"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
