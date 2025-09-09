"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/lib/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2"
    >
      <RefreshCw 
        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
      />
      {isRefreshing ? 'Atualizando...' : 'Atualizar'}
    </Button>
  );
}
