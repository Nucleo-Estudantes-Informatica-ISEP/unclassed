"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import type { SessionUser } from "@/services/getServerSession";

import DarkModeToggle from "../DarkModeToggle";
import UserMenu from "./UserMenu";

interface TopbarProps {
  user: Pick<SessionUser, "name" | "email" | "role"> | null;
}

const Topbar: React.FC<TopbarProps> = ({ user }) => {
  return (
    <header className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 left-0 z-30 w-full border-b backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
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

        <div className="flex items-center justify-end gap-2 sm:gap-x-4">
          <DarkModeToggle />
          {user ? (
            <UserMenu user={user} />
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
