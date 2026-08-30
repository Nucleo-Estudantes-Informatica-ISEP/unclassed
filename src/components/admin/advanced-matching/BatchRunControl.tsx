"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";

import type { BatchResult } from "./types";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";

async function runBatch(url: string): Promise<BatchResult> {
  const response = await fetch(url, { method: "PUT" });
  return response.json() as Promise<BatchResult>;
}

export function BatchRunControl() {
  const router = useRouter();
  const batch = useSWRMutation("/api/matching", runBatch, {
    onSuccess(result) {
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error("Falha no processamento em lote");
      }
    },
    onError(error) {
      console.error("Error running batch processing:", error);
      toast.error("Erro ao executar processamento em lote");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Batch Processing Control
        </CardTitle>
        <CardDescription>
          Manually trigger batch processing or view recent results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-medium">Manual Batch Processing</h3>
            <p className="text-muted-foreground text-sm">
              Process all active partitions for 3-way and multi-way matches
            </p>
          </div>
          <Button
            onClick={() => void batch.trigger()}
            disabled={batch.isMutating}
            className="flex items-center gap-2"
          >
            {batch.isMutating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Batch Processing
              </>
            )}
          </Button>
        </div>

        {batch.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Last Batch Processing Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">
                    Partitions Processed
                  </p>
                  <p className="font-bold">{batch.data.processedPartitions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Matches Found</p>
                  <p className="font-bold text-green-600">
                    {batch.data.matchesFound}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
                    Processing Time
                  </p>
                  <p className="font-bold">
                    {batch.data.totalProcessingTime}ms
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
                    Expired Provisional
                  </p>
                  <p className="font-bold text-orange-600">
                    {batch.data.expiredProvisionalMatches}
                  </p>
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2">
                {batch.data.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {batch.data.success ? "Sucesso" : "Falha"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                {batch.data.message}
              </p>

              {batch.data.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 font-medium text-red-600">Erros:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {batch.data.errors.map((error, index) => (
                      <li key={index} className="text-red-600">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
