"use client";

import { ArrowLeft, Check } from "lucide-react";

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

export interface WizardStep {
  id: string;
  label: string;
  title: string;
  description: string;
}

interface StepWizardProps {
  steps: WizardStep[];
  currentStepId: string;
  children: React.ReactNode;
}

export function StepWizard({
  steps,
  currentStepId,
  children,
}: StepWizardProps) {
  const currentStepIndex = Math.max(
    steps.findIndex((step) => step.id === currentStepId),
    0
  );
  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

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

        <div>
          <CardTitle>{currentStep.title}</CardTitle>
          <CardDescription className="mt-2">
            {currentStep.description}
          </CardDescription>
        </div>
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
