"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { toast } from "sonner";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleProfile = () => {
    setShowMenu(false);
    router.push("/profile");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      toast.success("Logout realizado com sucesso!");
      
      // Redirect to home page
      router.push("/");
      router.refresh();
      
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao fazer logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get initials for avatar
  const initials = user.name
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {/* User Info Button */}
      <Button 
        variant="ghost" 
        className="relative h-10 w-auto px-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
          {initials}
        </div>
        <div className="ml-2 hidden md:flex md:flex-col md:items-start">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
        {user.role === "ADMIN" && (
          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
            Admin
          </span>
        )}
      </Button>
      
      {/* Simple Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-12 w-64 bg-background border border-border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {user.role === "ADMIN" && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full w-fit">
                  Admin
                </span>
              )}
            </div>
          </div>
          
          <div className="p-2">
            <button 
              onClick={handleProfile}
              className="flex items-center w-full px-2 py-2 text-sm text-foreground hover:bg-muted rounded cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </button>
            
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center w-full px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "A sair..." : "Sair"}</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
