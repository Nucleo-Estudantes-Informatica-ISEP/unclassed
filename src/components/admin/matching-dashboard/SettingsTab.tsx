import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Button } from "@/lib/components/ui/button";
import { Settings } from "lucide-react";

interface SettingsTabProps {
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  partitions: number;
  activePartitions: number;
}

export function SettingsTab({ autoRefresh, toggleAutoRefresh, partitions, activePartitions }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
                <p className="font-medium">{partitions}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Partitions</p>
                <p className="font-medium">{activePartitions}</p>
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
    </div>
  );
}
