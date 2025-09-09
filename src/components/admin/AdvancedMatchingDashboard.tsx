"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
import { Progress } from "@/lib/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap, 
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  BarChart3,
  Timer
} from "lucide-react";
import { toast } from "sonner";

interface MatchingStats {
  partitions: number;
  activePartitions: number;
  totalActiveRequests: number;
  matches24h: number;
  provisionalMatches: number;
  averageSatisfactionScore: number;
  averageProcessingTime: number;
  partitionStats: PartitionStat[];
}

interface PartitionStat {
  partitionKey: string;
  ticketType: "SPECIFIC_CLASS" | "ALL_CLASSES";
  activeRequests: number;
  successRate: number;
  avgProcessingTime: number;
}

interface BatchResult {
  success: boolean;
  processedPartitions: number;
  matchesFound: number;
  totalProcessingTime: number;
  expiredProvisionalMatches: number;
  errors: string[];
  message: string;
}

export default function AdvancedMatchingDashboard() {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBatch, setRunningBatch] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<BatchResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    loadStats();
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadStats, 30000); // 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  }, [autoRefresh]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/matching');
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else {
        toast.error('Failed to load matching statistics');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error loading matching statistics');
    } finally {
      setLoading(false);
    }
  };

  const runBatchProcessing = async () => {
    setRunningBatch(true);
    try {
      const response = await fetch('/api/matching', { method: 'PUT' });
      const result = await response.json();
      
      setLastBatchResult(result);
      
      if (result.success) {
        toast.success(result.message);
        await loadStats(); // Refresh stats
      } else {
        toast.error('Batch processing failed');
      }
    } catch (error) {
      console.error('Error running batch processing:', error);
      toast.error('Error running batch processing');
    } finally {
      setRunningBatch(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium">Failed to load matching statistics</p>
            <Button onClick={loadStats} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Advanced Matching Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Monitor and control the advanced matching system with per-class graph partitioning
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={autoRefresh ? "default" : "secondary"} className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Auto-refresh {autoRefresh ? "ON" : "OFF"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
              >
                {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadStats}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="partitions">Graph Partitions</TabsTrigger>
            <TabsTrigger value="batch">Batch Processing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Requests
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalActiveRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {stats.activePartitions} active partitions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Matches (24h)
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.matches24h}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.provisionalMatches} provisional
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Satisfaction
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats.averageSatisfactionScore * 100).toFixed(1)}%
                  </div>
                  <Progress value={stats.averageSatisfactionScore * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Processing Time
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.averageProcessingTime.toFixed(0)}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per match found
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Graph Partitions</span>
                      <span>{stats.activePartitions} / {stats.partitions}</span>
                    </div>
                    <Progress value={(stats.activePartitions / stats.partitions) * 100} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Match Success Rate</span>
                      <span>{(stats.averageSatisfactionScore * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.averageSatisfactionScore * 100} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance Score</span>
                      <span>{Math.max(0, 100 - stats.averageProcessingTime / 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.max(0, 100 - stats.averageProcessingTime / 100)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partitions Tab */}
          <TabsContent value="partitions" className="space-y-6">
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
                  {stats.partitionStats.map((partition) => (
                    <Card key={partition.partitionKey}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">{partition.partitionKey}</CardTitle>
                            <CardDescription>
                              {partition.ticketType === "SPECIFIC_CLASS" ? "Subject-specific" : "All classes"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={partition.activeRequests > 0 ? "default" : "secondary"}>
                              {partition.activeRequests} active
                            </Badge>
                            <Badge variant="outline">
                              {(partition.successRate * 100).toFixed(1)}% success
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
                            <p className="text-muted-foreground">Success Rate</p>
                            <p className="font-medium">{(partition.successRate * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Processing</p>
                            <p className="font-medium">{partition.avgProcessingTime}ms</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={partition.successRate * 100} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {stats.partitionStats.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No active graph partitions</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Processing Tab */}
          <TabsContent value="batch" className="space-y-6">
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
                    disabled={runningBatch}
                    className="flex items-center gap-2"
                  >
                    {runningBatch ? (
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
                        <Timer className="h-4 w-4" />
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
                          {lastBatchResult.success ? "Success" : "Failed"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {lastBatchResult.message}
                      </p>

                      {lastBatchResult.errors.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Dashboard Settings
                </CardTitle>
                <CardDescription>
                  Configure dashboard refresh and display options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Auto-refresh</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh statistics every 30 seconds
                    </p>
                  </div>
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                    onClick={toggleAutoRefresh}
                  >
                    {autoRefresh ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">System Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Graph Partitions</p>
                      <p className="font-medium">{stats.partitions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active Partitions</p>
                      <p className="font-medium">{stats.activePartitions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{new Date().toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dashboard Version</p>
                      <p className="font-medium">v2.0 (Advanced)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
