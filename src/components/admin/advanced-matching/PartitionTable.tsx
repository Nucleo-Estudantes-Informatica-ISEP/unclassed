import { Database } from "lucide-react";

import type { PartitionStat } from "./types";
import { Badge } from "@/lib/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { Progress } from "@/lib/components/ui/progress";

export function PartitionTable({
  partitions,
}: {
  partitions: PartitionStat[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Graph Partitions
        </CardTitle>
        <CardDescription>
          Performance statistics for each graph partition
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {partitions.map((partition) => (
            <Card key={partition.partitionKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {partition.partitionKey}
                    </CardTitle>
                    <CardDescription>
                      {partition.ticketType === "SPECIFIC_CLASS"
                        ? "Subject-specific"
                        : "All classes"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        partition.activeRequests > 0 ? "default" : "secondary"
                      }
                    >
                      {partition.activeRequests} active
                    </Badge>
                    <Badge variant="outline">
                      {((partition.successRate ?? 0) * 100).toFixed(1)}% success
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Active Requests</p>
                    <p className="font-medium">{partition.activeRequests}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa de Sucesso</p>
                    <p className="font-medium">
                      {((partition.successRate ?? 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Processing</p>
                    <p className="font-medium">
                      {partition.avgProcessingTime ?? 0}ms
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress
                    value={(partition.successRate ?? 0) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {partitions.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              <Database className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No active graph partitions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
