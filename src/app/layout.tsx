import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/lib/components/ui/sonner";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

import { cn } from "@/lib/utils";
import Topbar from "@/components/Topbar";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import getServerSession from "@/services/getServerSession";

// Auto-initialize application services (cron scheduler, etc.)
import "@/lib/startup";


export const metadata: Metadata = {
  title: "Unclassed",
  description:
    "Uma plataforma para simplificar o processo de permutas de turma nos cursos de Informática do ISEP. By: NEI-ISEP",
  icons: {
    icon: "/public/logo/svg/icon-light.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  return (
    <html lang="pt">
      <body
        className={cn("bg-background font-sans antialiased", inter.variable)}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen">
            <Topbar user={session} />
            <main className="flex-grow pt-[12vh]">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
