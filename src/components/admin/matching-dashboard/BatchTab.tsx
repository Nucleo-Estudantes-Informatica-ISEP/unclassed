import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Button } from "@/lib/components/ui/button";
import { Clock, Zap, RefreshCw, Play, CheckCircle, AlertTriangle } from "lucide-react";
import { useBatchProcessing } from "./useMatchingData";

interface BatchTabProps {
  onSuccess: () => void; // Trigger a refresh when successful
}

export function BatchTab({ onSuccess }: BatchTabProps) {
  const { trigger, isMutating, data: lastBatchResult } = useBatchProcessing(onSuccess);

  const runBatchProcessing = () => {
    trigger();
  };

  return (
    <div className="space-y-6">
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Manual Batch Processing</h3>
              <p className="text-sm text-muted-foreground">
                Process all active partitions for 3-way and multi-way matches
              </p>
            </div>
            <Button 
              onClick={runBatchProcessing}
              disabled={isMutating}
              className="flex items-center gap-2"
            >
              {isMutating ? (
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

          {/* Last Batch Result */}
          {lastBatchResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Batch Processing Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Partitions Processed</p>
                    <p className="font-bold">{lastBatchResult.processedPartitions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Matches Found</p>
                    <p className="font-bold text-green-600">{lastBatchResult.matchesFound}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processing Time</p>
                    <p className="font-bold">{lastBatchResult.totalProcessingTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expired Provisional</p>
                    <p className="font-bold text-orange-600">{lastBatchResult.expiredProvisionalMatches}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  {lastBatchResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {lastBatchResult.success ? "Sucesso" : "Falha"}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {lastBatchResult.message}
                </p>

                {(lastBatchResult.errors?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-600 mb-2">Erros:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {lastBatchResult.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
