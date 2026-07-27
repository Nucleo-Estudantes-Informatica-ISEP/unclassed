"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  return (
    <footer className="border-t border-border/60 bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-center md:text-left text-xs md:text-sm text-muted-foreground max-w-[1066px]">
          A Unclassed é uma plataforma desenvolvida pelo NEI-ISEP para te ajudar a encontrar matches e trocar de turma. Para suporte ou esclarecimento de dúvidas técnicas, entra em contacto através do e-mail info@nei-isep.org.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/about" className="font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Sobre a plataforma
          </Link>
          <span className="text-muted-foreground whitespace-nowrap font-medium">v1.1</span>
        </div>
      </div>
    </footer>
  );
}
