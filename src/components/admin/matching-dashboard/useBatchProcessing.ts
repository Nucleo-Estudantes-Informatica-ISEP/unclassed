import { toast } from "sonner";
import useSWRMutation from "swr/mutation";

import type { BatchResult } from "./types";

async function triggerBatch(url: string) {
  const response = await fetch(url, { method: "PUT" });
  return response.json();
}

export function useBatchProcessing(onSuccess: () => void) {
  return useSWRMutation<BatchResult, Error, string, never>(
    "/api/matching",
    triggerBatch,
    {
      throwOnError: false,
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
          onSuccess();
        } else {
          toast.error("Falha no processamento em lote");
        }
      },
      onError: (error) => {
        console.error("Error running batch processing:", error);
        toast.error("Erro ao executar processamento em lote");
      },
    }
  );
}
