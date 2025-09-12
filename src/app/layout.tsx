import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/lib/components/ui/sonner";

import "./globals.css";

import { cn } from "@/lib/utils";
import getServerSession from "@/services/getServerSession";
import { Footer } from "@/components/Footer";
import Topbar from "@/components/Topbar";
import { ThemeProvider } from "@/context/ThemeContext";

// Auto-initialize application services (cron scheduler, etc.)
import "@/lib/startup";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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

  // Convert the Prisma user object to the Session type expected by Topbar
  const userSession = session
    ? {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      }
    : undefined;

  return (
    <html lang="pt">
      <body
        className={cn("bg-background font-sans antialiased", inter.variable)}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <Topbar user={userSession} />
            <main className="grow pt-[2vh]">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
