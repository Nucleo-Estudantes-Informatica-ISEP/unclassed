"use client";

import Image from "next/image";
import Link from "next/link";
import { User, LogOut, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import DarkModeToggle from "../DarkModeToggle";
import type { Session } from "@/types/Session";

interface TopbarProps {
  user?: Session;
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

  // Get initials for avatar
  const initials = user?.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 left-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <nav className="container flex h-16 md:h-[4.5rem] items-center justify-between gap-4">
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
            className="block h-7 w-auto dark:hidden sm:h-8"
            priority
          />
          <Image
            src="/images/unclassed-white.svg"
            alt="Unclassed Logo"
            width={100}
            height={28}
            className="hidden h-7 w-auto dark:block sm:h-8"
            priority
          />
        </Link>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {user && (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                Visão Geral
              </Link>
              <Link
                href="/swap-requests"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                Criar Pedido
              </Link>
              <Link
                href="/requests"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                Pedidos
              </Link>
              <Link
                href="/matches"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                Matches
              </Link>
              <Link
                href="/statistics"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
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
                  className="flex h-10 items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/60"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                    {initials}
                  </div>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  {user.role === "ADMIN" && (
                    <span className="hidden rounded-full bg-primary/10 px-2 py-1 text-xs text-primary lg:block">
                      Admin
                    </span>
                  )}
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
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
                          <span className="w-fit rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
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
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Visão Geral
                        </Link>
                        <Link
                          href="/swap-requests"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Criar Pedido
                        </Link>
                        <Link
                          href="/requests"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Pedidos
                        </Link>
                        <Link
                          href="/matches"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Matches
                        </Link>
                        <Link
                          href="/statistics"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Estatísticas
                        </Link>
                      </div>

                      <Link
                        href="/profile"
                        className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </Link>

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
