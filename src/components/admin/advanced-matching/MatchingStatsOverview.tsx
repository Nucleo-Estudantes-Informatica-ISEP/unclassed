import { Activity, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";

import type { MatchingStats } from "./types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { Progress } from "@/lib/components/ui/progress";

export function MatchingStatsOverview({ stats }: { stats: MatchingStats }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Requests
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalActiveRequests}
            </div>
            <p className="text-muted-foreground text-xs">
              Across {stats.activePartitions} active partitions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches (24h)</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches24h}</div>
            <p className="text-muted-foreground text-xs">
              {stats.provisionalMatches} provisional
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Satisfaction
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.averageSatisfactionScore * 100).toFixed(1)}%
            </div>
            <Progress
              value={stats.averageSatisfactionScore * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Processing Time
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageProcessingTime.toFixed(0)}ms
            </div>
            <p className="text-muted-foreground text-xs">Per match found</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Overall system performance and health indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Graph Partitions</span>
                <span>
                  {stats.activePartitions} / {stats.partitions}
                </span>
              </div>
              <Progress
                value={(stats.activePartitions / stats.partitions) * 100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Sucesso dos Matches</span>
                <span>
                  {(stats.averageSatisfactionScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.averageSatisfactionScore * 100} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Performance Score</span>
                <span>
                  {Math.max(0, 100 - stats.averageProcessingTime / 100).toFixed(
                    0
                  )}
                  %
                </span>
              </div>
              <Progress
                value={Math.max(0, 100 - stats.averageProcessingTime / 100)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
