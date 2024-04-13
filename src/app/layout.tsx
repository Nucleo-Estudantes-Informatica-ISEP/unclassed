import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import Topbar from "@/components/Topbar";
import { ThemeProvider } from "@/context/ThemeContext";

import "./globals.css";

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
    <html lang="pt" className={cn("h-full")}>
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Topbar />
          <main className="flex h-full grow flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
