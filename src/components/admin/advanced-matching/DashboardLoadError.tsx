"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/lib/components/ui/button";
import { Card, CardContent } from "@/lib/components/ui/card";

export function DashboardLoadError() {
  const router = useRouter();

  useEffect(() => {
    toast.error("Erro ao carregar estatísticas");
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium">
            Falha ao carregar estatísticas de matching
          </p>
          <Button onClick={() => router.refresh()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
