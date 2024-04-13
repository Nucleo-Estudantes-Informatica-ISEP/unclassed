import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import Topbar from "@/components/Topbar";
import { ThemeProvider } from "@/context/ThemeContext";

import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Unclassed",
  description:
    "Uma plataforma para simplificar o processo de permutas de turma nos cursos de Informática do ISEP. By: NEI-ISEP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body
        className={cn("bg-background font-sans antialiased", inter.variable)}
      >
        <SocketProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Topbar />
            <main className="flex size-full min-h-screen items-center justify-center py-4">
              {children}
            </main>
          </ThemeProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
