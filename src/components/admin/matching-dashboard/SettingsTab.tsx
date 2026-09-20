import { Settings } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";

interface SettingsTabProps {
  partitions: number;
  activePartitions: number;
  loadedAt: Date;
}

export function SettingsTab({
  partitions,
  activePartitions,
  loadedAt,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dashboard Settings
          </CardTitle>
          <CardDescription>
            Dashboard and matching system information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-medium">System Information</h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
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
                <p className="font-medium">
                  {loadedAt.toLocaleTimeString("pt-PT")}
                </p>
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
