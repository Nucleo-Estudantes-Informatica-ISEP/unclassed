import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/lib/components/ui/button";
import getServerSession from "@/services/getServerSession";
import {
  ArrowRight,
  ArrowLeftRight,
  Package2,
  Users,
  Sparkles,
  FileText,
  Search,
  Calendar,
} from "lucide-react";

const features = [
  {
    icon: ArrowLeftRight,
    title: "Permutas simples",
    description:
      "Troca de turma para disciplinas específicas de forma rápida e fácil.",
    href: "/swap-requests",
  },
  {
    icon: Package2,
    title: "Permutas completas",
    description:
      "Muda todas as disciplinas para uma nova turma de uma só vez.",
    href: "/swap-requests",
  },
  {
    icon: Users,
    title: "Matches inteligentes",
    description:
      "Sistema automático que encontra as melhores permutas para ti.",
    href: "/matches",
  },
];

const steps = [
  { n: "1", icon: FileText, bold: "Cria", rest: " um pedido" },
  { n: "2", icon: Search, bold: "Aguarda", rest: " pelo match" },
  { n: "3", icon: Calendar, bold: "Agenda", rest: " a reunião com o DEI" },
];

const Home: React.FC = async () => {
  const session = await getServerSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />

        <div className="container relative flex flex-col items-center text-center pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="inline-flex items-center gap-1.5 mb-6 rounded-full border border-transparent bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            Uma iniciativa do NEI-ISEP • Instituto Superior de Engenharia do
            Porto
          </div>

          <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl">
            A permuta de turmas,{" "}
            <span className="gradient-text">simplificada</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground text-balance">
            Cria pedidos, encontra matches e troca de turma de forma rápida e
            inteligente.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Button
              asChild
              size="xl"
              className="w-full sm:w-auto shadow-lg shadow-primary/20"
            >
              <Link href="/register">
                Quero registar-me
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/login">Entrar na plataforma</Link>
            </Button>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 w-full max-w-4xl px-4">
            {steps.map(({ n, icon: Icon, bold, rest }) => (
              <div
                key={n}
                className="group relative flex flex-col items-center px-4 py-6 rounded-2xl border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10 hover:bg-card/80 hover:border-primary/30"
              >
                <div className="absolute -top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {n}
                </div>
                <div className="mb-4 mt-2 rounded-full bg-primary/10 p-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Icon className="h-8 w-8" />
                </div>
                <p className="text-sm md:text-base text-foreground text-center">
                  <span className="font-semibold">{bold}</span>
                  {rest}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 md:py-28">
        <div className="flex flex-col items-center text-center mb-12 md:mb-16">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground mb-4">
            Tudo o que precisas
          </div>
          <h2 className="text-balance text-3xl md:text-4xl font-bold tracking-tight">
            Permutas de forma{" "}
            <span className="gradient-text">mais inteligente</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Uma plataforma pensada ao detalhe para simplificar o processo de
            troca de turma no DEI-ISEP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map(({ icon: Icon, title, description, href }) => (
            <Link key={title} href={href} className="group">
              <div className="h-full rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/30">
                <div className="p-6">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-semibold leading-none tracking-tight text-xl text-lg mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-6">
                    {description}
                  </p>
                  <div className="mt-5 inline-flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    Explorar
                    <ArrowRight className="ml-1.5 size-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary via-brand-500 to-brand-700 px-6 py-12 md:px-14 md:py-16 text-center text-white shadow-xl shadow-primary/20">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
          <div className="relative">
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-balance">
              Pronto para trocar de turma?
            </h3>
            <p className="mt-3 max-w-xl mx-auto text-white/80 text-balance">
              Cria a tua conta gratuita e começa a encontrar permutas com a
              comunidade do DEI-ISEP.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-white/90 shadow-md"
              >
                <Link href="/register">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
