"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import DarkModeToggle from "../DarkModeToggle";
import UserMenu from "./UserMenu";
import type { Session } from "@/types/Session";
import { useSystemStatus } from "@/context/SystemStatusContext";

interface TopbarProps {
  user?: Session;
}

const Topbar: React.FC<TopbarProps> = ({ user }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isUnavailable } = useSystemStatus();

  return (
    <nav className="relative left-0 top-0 z-50 w-full bg-[#CFCFCF]/80 backdrop-blur-sm shadow-sm dark:bg-[#101010]/80">
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

        {/* Desktop Navigation */}
        <div className="hidden items-center justify-center gap-2 sm:flex sm:flex-row sm:gap-x-4">
          <DarkModeToggle />
          {user ? (
            <>
              {(!isUnavailable || user.role === "ADMIN") && (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md border-none bg-[#101010] px-4 py-2 text-center font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/swap-requests"
                    className="rounded-md border-none bg-[#101010] px-4 py-2 text-center font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                  >
                    Criar Pedido
                  </Link>
                  <Link
                    href="/matches"
                    className="rounded-md border-none bg-[#101010] px-4 py-2 text-center font-medium text-white hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                  >
                    Meus Matches
                  </Link>
                </>
              )}
              <UserMenu user={user} isSystemUnavailable={isUnavailable} />
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

        {/* Mobile Menu Button */}
        <button
          className="rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary sm:hidden"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-gray-200 bg-white py-3 shadow-lg dark:border-gray-700 dark:bg-[#101010] sm:hidden"
        >
          <div className="flex flex-col space-y-2 px-4">
            <div className="flex justify-center py-2">
              <DarkModeToggle />
            </div>
            {user ? (
              <>
                {/* User info for mobile */}
                <div className="flex items-center space-x-3 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {user.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  {user.role === "ADMIN" && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                      Admin
                    </span>
                  )}
                </div>

                {(!isUnavailable || user.role === "ADMIN") && (
                  <>
                    <Link
                      href="/dashboard"
                      className="block rounded-md bg-[#101010] px-4 py-3 text-center font-medium text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/swap-requests"
                      className="block rounded-md bg-[#101010] px-4 py-3 text-center font-medium text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                      onClick={() => setMenuOpen(false)}
                    >
                      Criar Pedido
                    </Link>
                    <Link
                      href="/matches"
                      className="block rounded-md bg-[#101010] px-4 py-3 text-center font-medium text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meus Matches
                    </Link>
                  </>
                )}
                {(!isUnavailable || user.role === "ADMIN") && (
                  <Link
                    href="/profile"
                    className="block rounded-md bg-gray-100 px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Perfil
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    try {
                      const response = await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });
                      if (response.ok) {
                        window.location.href = "/";
                      }
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                  }}
                  className="block w-full rounded-md bg-red-100 px-4 py-3 text-center font-medium text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block rounded-md bg-[#101010] px-4 py-3 text-center font-medium text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90"
                onClick={() => setMenuOpen(false)}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Topbar;
