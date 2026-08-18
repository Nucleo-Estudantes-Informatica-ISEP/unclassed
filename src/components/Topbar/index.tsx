"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, RefreshCw, User, UserPlus } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import {
  signOutFromApp,
  switchAuthNeiAccount,
} from "@/lib/client-auth-actions";
import { Button } from "@/lib/components/ui/button";
import type { SessionUser } from "@/services/getServerSession";

import DarkModeToggle from "../DarkModeToggle";

interface TopbarProps {
  user: Pick<SessionUser, "name" | "email" | "role"> | null;
}

const Topbar: React.FC<TopbarProps> = ({ user }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/logout-url", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      const data = (await response.json()) as { redirectTo?: string };
      const redirectTo = data.redirectTo || "/";

      await signOut({ redirect: false });
      window.location.href = redirectTo;
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao fazer logout");
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAppLogout = async () => {
    await signOutFromApp("/");
  };

  const handleSwitchAccount = async () => {
    await switchAuthNeiAccount("/dashboard");
  };

  // Get initials for avatar
  const initials = user?.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 left-0 z-30 w-full border-b backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        {/* Left: Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex min-w-[120px] items-center gap-x-2"
        >
          <Image
            src="/images/unclassed-black.svg"
            alt="Unclassed Logo"
            width={100}
            height={28}
            className="block h-7 w-auto sm:h-8 dark:hidden"
            priority
          />
          <Image
            src="/images/unclassed-white.svg"
            alt="Unclassed Logo"
            width={100}
            height={28}
            className="hidden h-7 w-auto sm:h-8 dark:block"
            priority
          />
        </Link>

        {/* Center: Navigation Links */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {user && (
            <>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                Visão Geral
              </Link>
              <Link
                href="/swap-requests"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                Criar Pedido
              </Link>
              <Link
                href="/requests"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                Pedidos
              </Link>
              <Link
                href="/matches"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                Matches
              </Link>
              <Link
                href="/statistics"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                Estatísticas
              </Link>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 sm:gap-x-4">
          <DarkModeToggle />
          {user ? (
            <>
              {/* Removed redundant Home Button since it's now in the text links */}
              {/* User Menu */}
              <div className="relative">
                <button
                  className="hover:bg-accent/60 flex h-10 items-center gap-2 rounded-md px-2 py-1"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white">
                    {initials}
                  </div>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                  {user.role === "ADMIN" && (
                    <span className="bg-primary/10 text-primary hidden rounded-full px-2 py-1 text-xs lg:block">
                      Admin
                    </span>
                  )}
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
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
                      {/* Mobile Navigation Links */}
                      <div className="block md:hidden">
                        <Link
                          href="/dashboard"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Visão Geral
                        </Link>
                        <Link
                          href="/swap-requests"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Criar Pedido
                        </Link>
                        <Link
                          href="/requests"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Pedidos
                        </Link>
                        <Link
                          href="/matches"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Matches
                        </Link>
                        <Link
                          href="/statistics"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Estatísticas
                        </Link>
                      </div>

                      <Link
                        href="/profile"
                        className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </Link>

                      <button
                        onClick={handleAppLogout}
                        className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair apenas do Unclassed</span>
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
                        <span>
                          {isLoggingOut ? "A sair..." : "Sair do AuthNEI"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Click outside to close */}
                {showUserMenu && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <LogIn className="size-4" />
                  Entrar
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  <UserPlus className="size-4" />
                  Criar conta
                </Link>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Topbar;
