import { toast } from "sonner";
import useSWRMutation from "swr/mutation";

import type { BatchResult } from "./types";
import { logger } from "@/lib/clientLogger";
import { httpClient } from "@/lib/httpClient";

export function useBatchProcessing(onSuccess: () => void) {
  return useSWRMutation<BatchResult, Error, string, never>(
    "/api/matching",
    (url) => httpClient.put<BatchResult>(url),
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
      onError: () => {
        logger.error("Error running batch processing:");
        toast.error("Erro ao executar processamento em lote");
      },
    }
  );
}
