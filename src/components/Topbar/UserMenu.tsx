"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, UserCog } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { switchAuthNeiAccount } from "@/lib/client-auth-actions";
import { Button } from "@/lib/components/ui/button";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleManageProfile = () => {
    setShowMenu(false);
    router.push("/api/auth/profile-url");
  };

  const handleSwitchAccount = async () => {
    setShowMenu(false);
    await switchAuthNeiAccount("/dashboard");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowMenu(false);

    try {
      const response = await fetch("/api/logout-url", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Falha no logout");
      }

      const data = (await response.json()) as { redirectTo?: string };
      const redirectTo = data.redirectTo || "/";

      await signOut({ redirect: false });
      window.location.href = redirectTo;
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao terminar sessão");
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="relative h-10 w-auto px-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white">
          {initials}
        </div>
        <div className="ml-2 hidden lg:flex lg:flex-col lg:items-start">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </div>
        {user.role === "ADMIN" && (
          <span className="bg-primary/10 text-primary ml-2 hidden rounded-full px-2 py-1 text-xs lg:block">
            Admin
          </span>
        )}
      </Button>

      {showMenu && (
        <div className="border-border bg-background absolute top-12 right-0 z-50 w-64 rounded-lg border shadow-lg">
          <div className="border-border border-b p-3">
            <div className="flex flex-col space-y-1">
              <p className="text-foreground text-sm leading-none font-medium">
                {user.name}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user.email}
              </p>
              {user.role === "ADMIN" && (
                <span className="bg-primary/10 text-primary w-fit rounded-full px-2 py-1 text-xs">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="p-2">
            <div className="block md:hidden">
              <Link
                href="/dashboard"
                className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                onClick={() => setShowMenu(false)}
              >
                Visão Geral
              </Link>
              <Link
                href="/swap-requests"
                className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                onClick={() => setShowMenu(false)}
              >
                Criar Pedido
              </Link>
              <Link
                href="/requests"
                className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                onClick={() => setShowMenu(false)}
              >
                Pedidos
              </Link>
              <Link
                href="/matches"
                className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                onClick={() => setShowMenu(false)}
              >
                Matches
              </Link>
              <Link
                href="/statistics"
                className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                onClick={() => setShowMenu(false)}
              >
                Estatísticas
              </Link>
              <div className="border-border my-1 border-t" />
            </div>

            <button
              onClick={handleManageProfile}
              className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
            >
              <UserCog className="mr-2 h-4 w-4" />
              <span>Gerir perfil</span>
            </button>

            <button
              onClick={handleSwitchAccount}
              className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Trocar de conta</span>
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "A sair..." : "Terminar sessão"}</span>
            </button>
          </div>
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
