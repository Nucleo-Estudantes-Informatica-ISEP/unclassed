"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, Check, Package2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { cn } from "@/lib/utils";
import { StepWizard, WizardNavigation } from "@/components/ui/step-wizard";
import BundleSwapRequestForm from "@/components/forms/BundleSwapRequestForm";
import SingleSwapRequestForm from "@/components/forms/SingleSwapRequestForm";
import { RequestStatusPanel } from "@/components/swap-requests/RequestStatusPanel";
import { MatchReviewStep } from "@/components/swap-requests/MatchReviewStep";

import { getRequestWizardSteps, type RequestType } from "./requestWizardSteps";

const requestTypes = [
  {
    id: "single" as const,
    title: "Permuta individual",
    description:
      "Troca de turma numa disciplina específica e mantém as restantes.",
    icon: ArrowLeftRight,
  },
  {
    id: "bundle" as const,
    title: "Permuta completa",
    description: "Muda de turma em todas as disciplinas do mesmo ano.",
    icon: Package2,
  },
];

interface SwapRequestsClientProps {
  currentUserId: string;
}

export default function SwapRequestsClient({
  currentUserId,
}: SwapRequestsClientProps) {
  const searchParams = useSearchParams();
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [trackedRequestId, setTrackedRequestId] = useState<string | null>(
    null
  );
  const [matchId, setMatchId] = useState<string | null>(null);
  const steps = getRequestWizardSteps(requestType);
  const currentStep = steps[currentStepIndex];

  // Restore an in-progress/completed request from its bookmarkable URL
  // (?type=...&requestId=...) so a student who closes the tab mid-flow, or
  // returns later to check status, lands back where they left off instead
  // of restarting the create flow.
  useEffect(() => {
    const type = searchParams.get("type");
    const requestId = searchParams.get("requestId");

    if ((type === "single" || type === "bundle") && requestId) {
      setRequestType(type);
      setTrackedRequestId(requestId);
      setCurrentStepIndex(2);
    }
    // Only meant to run once, off the URL present on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background w-full py-8">
      <div className="container mx-auto px-4 sm:px-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Criar Pedido de Permuta
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Segue os passos para indicar a tua situação e as turmas que
            preferes.
          </p>
        </div>

        <StepWizard steps={steps} currentStepId={currentStep.id}>
          {currentStepIndex === 0 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {requestTypes.map((option) => {
                  const Icon = option.icon;
                  const isSelected = requestType === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRequestType(option.id)}
                      className={cn(
                        "bg-card hover:border-primary/60 focus-visible:ring-ring relative rounded-xl border p-5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        isSelected &&
                          "border-primary bg-primary/5 ring-primary ring-1"
                      )}
                      aria-pressed={isSelected}
                    >
                      <span className="bg-primary/10 text-primary mb-4 flex size-10 items-center justify-center rounded-lg">
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="block font-semibold">
                        {option.title}
                      </span>
                      <span className="text-muted-foreground mt-1 block text-sm">
                        {option.description}
                      </span>
                      {isSelected && (
                        <span className="bg-primary text-primary-foreground absolute top-4 right-4 flex size-6 items-center justify-center rounded-full">
                          <Check aria-hidden="true" />
                          <span className="sr-only">Selecionado</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <WizardNavigation
                nextLabel="Continuar"
                nextDisabled={!requestType}
                onNext={() => setCurrentStepIndex(1)}
              />
            </div>
          )}

          {currentStepIndex === 2 && trackedRequestId && requestType && (
            <RequestStatusPanel
              requestId={trackedRequestId}
              requestType={requestType}
              onMatchFound={(foundMatchId) => {
                setMatchId(foundMatchId);
                if (steps.length > 3) {
                  setCurrentStepIndex(3);
                }
              }}
            />
          )}

          {currentStepIndex === 3 && matchId && (
            <MatchReviewStep
              matchId={matchId}
              currentUserId={currentUserId}
              canAdvance={steps.length > 4}
              onAdvance={() => setCurrentStepIndex(4)}
            />
          )}

          {requestType === "single" && !(currentStepIndex === 2 && trackedRequestId) && (
            <div className={cn(currentStepIndex === 0 && "hidden")}>
              <SingleSwapRequestForm
                step={currentStepIndex === 2 ? "preferences" : "details"}
                onBack={() => setCurrentStepIndex((step) => step - 1)}
                onNext={() => setCurrentStepIndex(2)}
              />
            </div>
          )}

          {requestType === "bundle" && !(currentStepIndex === 2 && trackedRequestId) && (
            <div className={cn(currentStepIndex === 0 && "hidden")}>
              <BundleSwapRequestForm
                step={currentStepIndex === 2 ? "preferences" : "details"}
                onBack={() => setCurrentStepIndex((step) => step - 1)}
                onNext={() => setCurrentStepIndex(2)}
              />
            </div>
          )}
        </StepWizard>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Precisas de ajuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium">Como funciona o sistema?</h4>
                <p className="text-muted-foreground">
                  Depois de criares um pedido, o sistema procura estudantes que
                  querem fazer uma troca compatível e notifica todos os
                  envolvidos.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">
                  Posso criar vários pedidos?
                </h4>
                <p className="text-muted-foreground">
                  Podes ter vários pedidos ativos, mas apenas um por disciplina
                  ou um pedido completo por turma atual.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Quando serei notificado?</h4>
                <p className="text-muted-foreground">
                  Receberás uma notificação quando o sistema encontrar uma
                  permuta possível. Poderás então aceitar ou rejeitar a
                  proposta.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Posso cancelar um pedido?</h4>
                <p className="text-muted-foreground">
                  Sim. Podes cancelar pedidos no painel pessoal enquanto ainda
                  não tiverem sido aprovados para uma permuta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
