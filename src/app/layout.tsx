import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/lib/components/ui/sonner";

import "./globals.css";

import { cn } from "@/lib/utils";
import getServerSession from "@/services/getServerSession";
import { Footer } from "@/components/Footer";
import Topbar from "@/components/Topbar";
import { ThemeProvider } from "@/context/ThemeContext";
import CookieConsent from "@/components/CookieConsent";

// Auto-initialize application services (cron scheduler, etc.)
import "@/lib/startup";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Unclassed",
  description:
    "Uma plataforma para simplificar o processo de permutas de turma nos cursos de Informática do ISEP. By: NEI-ISEP",
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const topbarUser = session
    ? {
        name: session.name,
        email: session.email,
        role: session.role,
      }
    : null;

  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={cn("min-h-screen bg-background text-foreground antialiased transition-colors font-sans", inter.variable)}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="relative flex min-h-screen flex-col">
            <Topbar user={topbarUser} />
            <main className="flex-1 flex"><div className="flex items-stretch w-full">{children}</div></main>
            <Footer />
          </div>
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
