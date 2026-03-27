"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, User, LogOut } from "lucide-react";
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
      await signOut({ redirect: false });
      window.location.href = "/";
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
    <nav className="relative left-0 top-0 z-50 w-full bg-transparent">
      <div className="flex h-20 min-h-[72px] flex-row items-center justify-between px-4 py-3 sm:px-10">
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

        {/* Navigation - Always visible */}
        <div className="flex items-center justify-center gap-2 sm:gap-x-4">
          <DarkModeToggle />
          {user ? (
            <>
              {/* Navigation Links */}
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/swap-requests"
                  className="rounded-md border-none bg-[#101010] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                >
                  Criar Pedido
                </Link>
                <Link
                  href="/matches"
                  className="rounded-md border-none bg-[#101010] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                >
                  Meus Matches
                </Link>
              </div>

              {/* Home Button */}
              <Link
                href="/dashboard"
                className="rounded-md border-none bg-[#101010] px-4 py-2 text-center font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
              >
                <Home className="h-5 w-5" />
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  className="flex h-10 items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {initials}
                  </div>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  {user.role === "ADMIN" && (
                    <span className="hidden rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100 lg:block">
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
                          <span className="w-fit rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2">
                      {/* Mobile Navigation Links */}
                      <div className="block md:hidden">
                        <Link
                          href="/swap-requests"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Criar Pedido
                        </Link>
                        <Link
                          href="/matches"
                          className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Meus Matches
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
            <Link
              href="/login"
              className="rounded-md border-none bg-[#101010] px-4 py-2 text-center font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Topbar;
