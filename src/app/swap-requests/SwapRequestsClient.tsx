"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { ArrowLeftRight, Package2 } from "lucide-react";

import SingleSwapRequestForm from "@/components/forms/SingleSwapRequestForm";
import BundleSwapRequestForm from "@/components/forms/BundleSwapRequestForm";

export default function SwapRequestsClient() {
  const [activeTab, setActiveTab] = useState("single");

  const handleSuccess = () => {
    // Could redirect to dashboard or show success message
    // For now, we'll just reset the form (handled in the form components)
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Criar Pedido de Permuta</h1>
          <p className="text-muted-foreground mt-2">
            Cria um pedido para trocar de turma. Podes escolher entre permuta individual ou completa.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Permuta Individual
            </TabsTrigger>
            <TabsTrigger value="bundle" className="flex items-center gap-2">
              <Package2 className="w-4 h-4" />
              Permuta Completa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5" />
                  Permuta Individual
                  <Badge variant="outline">Disciplina Específica</Badge>
                </CardTitle>
                <CardDescription>
                  Troca de turma numa disciplina específica. Ideal quando queres mudar apenas uma disciplina.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-600 dark:text-green-400">✓ Vantagens:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Mudança específica e controlada</li>
                      <li>Mantém outras disciplinas inalteradas</li>
                      <li>Mais fácil de encontrar matches</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-600 dark:text-blue-400">ℹ️ Ideal para:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Conflitos de horário numa disciplina</li>
                      <li>Preferência por um professor específico</li>
                      <li>Necessidade de ajustar apenas uma matéria</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <SingleSwapRequestForm onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent value="bundle" className="space-y-6">
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="w-5 h-5" />
                  Permuta Completa
                  <Badge variant="outline">Todas as Disciplinas</Badge>
                </CardTitle>
                <CardDescription>
                  Troca completa de turma em todas as disciplinas do ano. Mudança total para nova turma.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-600 dark:text-green-400">✓ Vantagens:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Mudança completa de ambiente</li>
                      <li>Todos os colegas e horários novos</li>
                      <li>Solução para problemas gerais de horário</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-600 dark:text-blue-400">ℹ️ Ideal para:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Mudança completa de horário</li>
                      <li>Problemas gerais com a turma atual</li>
                      <li>Querer integrar-se noutra turma</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <BundleSwapRequestForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Como funciona o sistema?</h4>
                <p className="text-muted-foreground">
                  Depois de criar um pedido, o sistema procura automaticamente por outros estudantes 
                  que querem fazer a troca oposta. Quando encontra uma combinação, notifica todos os envolvidos.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Posso criar vários pedidos?</h4>
                <p className="text-muted-foreground">
                  Podes ter múltiplos pedidos ativos, mas apenas um por disciplina (individual) ou 
                  um por turma atual (completa). Isso evita conflitos no sistema.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Quando serei notificado?</h4>
                <p className="text-muted-foreground">
                  Receberás uma notificação quando o sistema encontrar uma permuta possível. 
                  Terás então a oportunidade de aceitar ou rejeitar a proposta.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Posso cancelar um pedido?</h4>
                <p className="text-muted-foreground">
                  Sim! Podes cancelar os teus pedidos a qualquer momento através do teu painel pessoal, 
                  desde que ainda não tenham sido aprovados para uma permuta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
