"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/lib/components/ui/button";

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
      const response = await fetch("/api/logout-url", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Falha no logout");
      }

      const data = (await response.json()) as { redirectTo?: string };
      await signOut({ redirectTo: data.redirectTo || "/" });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao fazer logout");
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get initials for avatar
  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative hidden sm:block">
      {/* User Info Button - Desktop only */}
      <Button
        variant="ghost"
        className="relative h-10 w-auto px-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {initials}
        </div>
        <div className="ml-2 hidden md:flex md:flex-col md:items-start">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
        {user.role === "ADMIN" && (
          <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            Admin
          </span>
        )}
      </Button>

      {/* Simple Dropdown Menu - Desktop only */}
      {showMenu && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border p-3">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">
                {user.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {user.role === "ADMIN" && (
                <span className="w-fit rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={handleProfile}
              className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
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
