"use client";

import { useState } from "react";
import { ArrowLeftRight, Package2 } from "lucide-react";

import { Badge } from "@/lib/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/lib/components/ui/tabs";
import BundleSwapRequestForm from "@/components/forms/BundleSwapRequestForm";
import SingleSwapRequestForm from "@/components/forms/SingleSwapRequestForm";

export default function SwapRequestsClient() {
  const [activeTab, setActiveTab] = useState("single");

  const handleSuccess = () => {
    // Could redirect to dashboard or show success message
    // For now, we'll just reset the form (handled in the form components)
  };

  return (
    <div className="w-full bg-background py-8">
      <div className="container mx-auto px-4 sm:px-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Criar Pedido de Permuta</h1>
          <p className="text-sm text-muted-foreground sm:text-base mt-1">
            Cria um pedido para trocar de turma. Podes escolher entre permuta
            individual ou completa.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 rounded-lg">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden sm:inline">
                Permuta Individual (1 disciplina)
              </span>
              <span className="sm:hidden">Individual</span>
            </TabsTrigger>
            <TabsTrigger value="bundle" className="flex items-center gap-2">
              <Package2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                Permuta Completa (todas as disciplinas)
              </span>
              <span className="sm:hidden">Completa</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            <Card className="mb-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="size-5" />
                  Permuta Individual
                  <Badge variant="outline">Disciplina Específica</Badge>
                </CardTitle>
                <CardDescription>
                  Troca de turma numa disciplina específica. Ideal quando queres
                  mudar apenas uma disciplina.
                </CardDescription>
              </CardHeader>
            </Card>

            <SingleSwapRequestForm onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent value="bundle" className="space-y-6">
            <Card className="mb-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="size-5" />
                  Permuta Completa
                  <Badge variant="outline">Todas as Disciplinas</Badge>
                </CardTitle>
                <CardDescription>
                  Troca completa de turma em todas as disciplinas do ano.
                  Mudança total para nova turma.
                </CardDescription>
              </CardHeader>
            </Card>

            <BundleSwapRequestForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-8 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium">Como funciona o sistema?</h4>
                <p className="text-muted-foreground">
                  Depois de criar um pedido, o sistema procura automaticamente
                  por outros estudantes que querem fazer a troca oposta. Quando
                  encontra uma combinação, notifica todos os envolvidos.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">
                  Posso criar vários pedidos?
                </h4>
                <p className="text-muted-foreground">
                  Podes ter múltiplos pedidos ativos, mas apenas um por
                  disciplina (individual) ou um por turma atual (completa). Isso
                  evita conflitos no sistema.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Quando serei notificado?</h4>
                <p className="text-muted-foreground">
                  Receberás uma notificação quando o sistema encontrar uma
                  permuta possível. Terás então a oportunidade de aceitar ou
                  rejeitar a proposta.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Posso cancelar um pedido?</h4>
                <p className="text-muted-foreground">
                  Sim! Podes cancelar os teus pedidos a qualquer momento através
                  do teu painel pessoal, desde que ainda não tenham sido
                  aprovados para uma permuta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
