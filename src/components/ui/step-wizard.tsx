"use client";

import { useState } from "react";
import { ArrowLeft, Check, CircleHelp, EyeOff } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { Progress } from "@/lib/components/ui/progress";
import { cn } from "@/lib/utils";

export type WizardGuidanceMode = "guided" | "basic";

export interface WizardStep {
  id: string;
  label: string;
  title: string;
  description: string;
  guidance: string;
}

interface StepWizardProps {
  steps: WizardStep[];
  currentStepId: string;
  initialGuidanceMode?: WizardGuidanceMode;
  children: React.ReactNode;
}

export function StepWizard({
  steps,
  currentStepId,
  initialGuidanceMode = "basic",
  children,
}: StepWizardProps) {
  const [guidanceMode, setGuidanceMode] =
    useState<WizardGuidanceMode>(initialGuidanceMode);
  const currentStepIndex = Math.max(
    steps.findIndex((step) => step.id === currentStepId),
    0
  );
  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const guidanceVisible = guidanceMode === "guided";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Passo {currentStepIndex + 1} de {steps.length}
            </span>
            <span className="text-muted-foreground">{currentStep.label}</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            role="progressbar"
            aria-label="Progresso da criação do pedido"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          />
        </div>

        <ol
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          }}
          aria-label="Passos do pedido"
        >
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isComplete = index < currentStepIndex;

            return (
              <li
                key={step.id}
                className={cn(
                  "text-muted-foreground flex items-center gap-2 text-xs sm:text-sm",
                  (isCurrent || isComplete) && "text-foreground"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isCurrent &&
                      "border-primary bg-primary text-primary-foreground",
                    isComplete && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  {isComplete ? <Check aria-hidden="true" /> : index + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription className="mt-2">
              {currentStep.description}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 self-start"
            onClick={() =>
              setGuidanceMode((mode) =>
                mode === "guided" ? "basic" : "guided"
              )
            }
            aria-pressed={guidanceVisible}
          >
            {guidanceVisible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <CircleHelp aria-hidden="true" />
            )}
            {guidanceVisible ? "Ignorar ajuda" : "Mostrar ajuda"}
          </Button>
        </div>

        {guidanceVisible && (
          <div
            className="border-primary/20 bg-primary/5 rounded-lg border p-4"
            role="note"
            aria-label="Ajuda deste passo"
          >
            <div className="text-primary flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4" aria-hidden="true" />
              Ajuda deste passo
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {currentStep.guidance}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface WizardNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
  submit?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  isSubmitting = false,
  submittingLabel = "A criar...",
  submit = false,
}: WizardNavigationProps) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-11"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Button>
      ) : (
        <span />
      )}
      <Button
        type={submit ? "submit" : "button"}
        onClick={submit ? undefined : onNext}
        disabled={nextDisabled || isSubmitting}
        className="h-11 sm:min-w-40"
      >
        {isSubmitting ? submittingLabel : nextLabel}
      </Button>
    </div>
  );
}
