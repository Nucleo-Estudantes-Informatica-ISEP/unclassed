import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Progress } from "@/lib/components/ui/progress";
import { Activity, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { CronStats, CronExecution } from "./types";

interface CronTabProps {
  cronStats: CronStats;
  cronHistory: CronExecution[];
}

export function CronTab({ cronStats, cronHistory }: CronTabProps) {
  return (
    <div className="space-y-6">
      {/* Cron Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduler Status
            </CardTitle>
            <Activity className={`h-4 w-4 ${
              cronStats.schedulerStatus === 'RUNNING' 
                ? 'text-green-500' 
                : 'text-red-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cronStats.schedulerStatus}
            </div>
            <p className="text-xs text-muted-foreground">
              {cronStats.activeJobs} active jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Run
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cronStats.lastRunTime 
                ? new Date(cronStats.lastRunTime).toLocaleTimeString()
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {cronStats.lastRunTime 
                ? new Date(cronStats.lastRunTime).toLocaleDateString()
                : 'No executions yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Matches Found (24h)
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {cronStats.totalMatchesFound24h}
            </div>
            <p className="text-xs text-muted-foreground">
              From {cronStats.totalExecutions24h} executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Sucesso (24h)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(cronStats.successRate24h * 100).toFixed(1)}%
            </div>
            <Progress value={cronStats.successRate24h * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Execution Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Execution Performance (24h)
          </CardTitle>
          <CardDescription>
            Performance metrics for cron job executions in the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Executions</span>
                <span>{cronStats.totalExecutions24h}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Successful</span>
                <span className="text-green-600">{cronStats.successfulExecutions24h}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Falhadas</span>
                <span className="text-red-600">{cronStats.failedExecutions24h}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg Execution Time</span>
                <span>{cronStats.averageExecutionTime}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Expired Matches</span>
                <span className="text-orange-600">{cronStats.totalExpiredMatches24h}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Currently Running</span>
                <span className={cronStats.isRunning ? 'text-primary' : 'text-muted-foreground'}>
                  {cronStats.isRunning ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Next Scheduled Runs:</h4>
              {cronStats.nextScheduledRuns.slice(0, 3).map((run, index) => (
                <div key={index} className="text-xs">
                  <span className="font-medium">{run.jobName}:</span>
                  <br />
                  <span className="text-muted-foreground">
                    {run.nextRun ? new Date(run.nextRun).toLocaleString() : 'Not scheduled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Execution History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Execution History
          </CardTitle>
          <CardDescription>
            Latest cron job executions with detailed results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cronHistory.slice(0, 10).map((execution) => (
              <div key={execution.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{execution.jobName}</h4>
                      <Badge variant={
                        execution.status === 'COMPLETED' ? 'default' :
                        execution.status === 'FAILED' ? 'destructive' :
                        execution.status === 'RUNNING' ? 'secondary' :
                        'outline'
                      }>
                        {execution.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="font-medium">
                          {new Date(execution.startedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {execution.duration && (
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{execution.duration}ms</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-muted-foreground">Matches Found</p>
                        <p className="font-medium text-green-600">
                          {execution.matchesFound}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Active Requests</p>
                        <p className="font-medium">{execution.totalActiveRequests}</p>
                      </div>
                    </div>
                    
                    {execution.errors.length > 0 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {execution.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {cronHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No cron execution history available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
