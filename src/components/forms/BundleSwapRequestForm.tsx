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
import { Badge } from "@/lib/components/ui/badge";

import { bundleSwapRequestSchema, BundleSwapRequestForm as FormType } from "@/schemas/swapRequestSchema";
import { useClasses } from "@/hooks/useApi";

interface BundleSwapRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BundleSwapRequestForm({ onSuccess, onCancel }: BundleSwapRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const router = useRouter();

  const form = useForm<FormType>({
    resolver: zodResolver(bundleSwapRequestSchema),
    defaultValues: {
      preferredClassIds: [],
      preferenceOrderMatters: true,
    },
  });

  const { data: allClasses, loading: classesLoading, error: classesError } = useClasses();
  
  // Filter classes by selected year
  const classes = allClasses?.filter(c => selectedYear ? c.year === selectedYear : true) || [];
  
  // Get unique years from classes
  const years = allClasses ? [...new Set(allClasses.map(c => c.year))].sort() : [];

  // Convert classes to options for ClassRankingSelector
  const classOptions = classes?.map(cls => ({
    id: cls.id,
    name: cls.name,
  })) || [];

  const onSubmit = async (data: FormType) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/swap-requests/bundle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar pedido de permuta");
      }

      toast.success("Pedido de permuta completa criado com sucesso! Redirecionando para os matches...");
      form.reset();
      
      // Redirect to matches page after a short delay to show the toast
      setTimeout(() => {
        router.push('/matches');
      }, 1500);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error creating bundle swap request:", error);
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentClassId = form.watch("currentClassId");
  const availableClassOptions = classOptions.filter(option => option.id !== currentClassId);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Criar Pedido de Permuta Completa
          <Badge variant="secondary">Bundle</Badge>
        </CardTitle>
        <CardDescription>
          Cria um pedido para trocar de turma em todas as disciplinas (mudança completa de turma).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Sobre Permutas Completas
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Uma permuta completa permite-te trocar de turma em todas as disciplinas do ano académico. 
            Isto é útil quando queres mudar completamente para uma turma diferente.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano Académico</label>
              <Select
                value={selectedYear?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedYear(value ? parseInt(value) : undefined);
                  // Reset form when year changes
                  form.reset({
                    preferredClassIds: [],
                    preferenceOrderMatters: true,
                  });
                }}
              >
                <SelectTrigger>
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
              <p className="text-sm text-muted-foreground">
                Só podes fazer permutas completas dentro do mesmo ano académico.
              </p>
            </div>

            {/* Current Class Selection */}
            <FormField
              control={form.control}
              name="currentClassId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma Atual</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={classesLoading || !selectedYear}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleciona a tua turma atual" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.year}º Ano)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A turma em que estás atualmente inscrito para todas as disciplinas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Classes Selection */}
            <FormField
              control={form.control}
              name="preferredClassIds"
              render={({ field }) => {
                console.log('DEBUG preferredClassIds:', {
                  classOptions,
                  availableClassOptions,
                  currentClassId,
                  selectedYear,
                  fieldValue: field.value
                });

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
                        placeholder="Seleciona as turmas para as quais gostarias de mudar completamente"
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>💡 Permuta Completa:</strong> Mudará todas as tuas disciplinas para a turma selecionada.
                          Ideal quando queres mudar completamente de horário ou ambiente de turma.
                        </p>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Additional Info */}
            {currentClassId && form.watch("preferredClassIds").length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  ✅ Pedido Configurado
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Vais criar um pedido para mudar da turma{" "}
                  <strong>{classes?.find(c => c.id === currentClassId)?.name}</strong> para uma das turmas selecionadas.
                  O sistema tentará encontrar alguém que queira fazer a troca oposta.
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || classesLoading || !selectedYear}
                className="flex-1"
              >
                {isSubmitting ? "A criar..." : "Criar Pedido Completo"}
              </Button>
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
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
