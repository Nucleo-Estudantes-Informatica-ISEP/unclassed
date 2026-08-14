"use client";

import { useWatch, type FieldPath, type UseFormReturn } from "react-hook-form";

import {
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
import { ClassRankingSelector } from "@/components/ui/class-ranking-selector";
import type { SwapRequestFormBase } from "@/hooks/useSwapRequestWizardForm";

interface ClassOption {
  id: string;
  name: string;
}

interface YearSelectProps {
  id: string;
  years: number[];
  value: number | undefined;
  onChange: (year: number) => void;
  disabled?: boolean;
  error?: string;
}

export function YearSelect({ id, years, value, onChange, disabled, error }: YearSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Ano Académico</Label>
      <Select
        value={value?.toString() ?? ""}
        onValueChange={(next) => onChange(Number(next))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
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
      {error && (
        <p className="text-destructive text-sm font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface CurrentClassFieldProps<T extends SwapRequestFormBase> {
  form: UseFormReturn<T>;
  classes: ClassOption[];
  disabled?: boolean;
}

export function CurrentClassField<T extends SwapRequestFormBase>({
  form,
  classes,
  disabled,
}: CurrentClassFieldProps<T>) {
  const fieldName = "currentClassId" as FieldPath<T>;

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Turma Atual</FormLabel>
          <Select
            onValueChange={(value) => {
              field.onChange(value);
              const preferred = form.getValues(
                "preferredClassIds" as FieldPath<T>
              ) as string[];
              form.setValue(
                "preferredClassIds" as FieldPath<T>,
                preferred.filter((classId) => classId !== value) as unknown as never
              );
            }}
            value={field.value as string}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleciona a tua turma atual" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {classes.map((currentClass) => (
                <SelectItem key={currentClass.id} value={currentClass.id}>
                  {currentClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface PreferredClassesFieldProps<T extends SwapRequestFormBase> {
  form: UseFormReturn<T>;
  classOptions: ClassOption[];
  availableClassOptions: ClassOption[];
  loading: boolean;
  error?: string | null;
}

export function PreferredClassesField<T extends SwapRequestFormBase>({
  form,
  classOptions,
  availableClassOptions,
  loading,
  error,
}: PreferredClassesFieldProps<T>) {
  const preferredField = "preferredClassIds" as FieldPath<T>;
  const orderMattersField = "preferenceOrderMatters" as FieldPath<T>;
  const preferenceOrderMatters = useWatch({
    control: form.control,
    name: orderMattersField,
  }) as boolean;

  return (
    <FormField
      control={form.control}
      name={preferredField}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Turmas Preferidas</FormLabel>
          {error ? (
            <div
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
              role="alert"
            >
              Erro ao carregar turmas: {error}
            </div>
          ) : loading ? (
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
                value={field.value as string[]}
                onChange={field.onChange}
                preferenceOrderMatters={preferenceOrderMatters}
                onPreferenceOrderChange={(orderMatters) =>
                  form.setValue(orderMattersField, orderMatters as unknown as never)
                }
                placeholder="Seleciona as turmas para as quais gostarias de mudar"
              />
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
