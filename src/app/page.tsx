import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/lib/components/ui/button";
import getServerSession from "@/services/getServerSession";

const Home: React.FC = async () => {
  const session = await getServerSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradients + grid (deep layer) */}
      <div className="bg-radial bg-grid pointer-events-none absolute inset-0 -z-30" />

      {/* Montage layer (Group 1814) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-20 flex justify-center">
        <Image
          src="/images/group-1814.png"
          alt="Geometric montage"
          width={1606}
          height={944}
          className="hidden select-none opacity-35 md:block"
          priority
        />
      </div>

      {/* Floating shapes foreground */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/diamond-shape.png"
          alt="Diamond"
          width={540}
          height={360}
          className="absolute right-[-40px] top-2 block scale-[.45] animate-float opacity-60 sm:scale-[.6] md:-right-24 md:top-10 md:scale-100 md:opacity-70"
          priority
        />
        <Image
          src="/images/lightning.png"
          alt="Lightning"
          width={280}
          height={820}
          className="absolute left-2 top-40 block rotate-[10deg] scale-[.35] animate-drift opacity-60 sm:scale-[.5] md:left-[-40px] md:top-[20%] md:scale-100"
          priority
        />
        <Image
          src="/images/loop-abstract-shape.png"
          alt="Loop abstract"
          width={360}
          height={360}
          className="absolute bottom-[-20px] right-2 block -rotate-[14deg] scale-[.5] animate-spin-slow opacity-70 sm:scale-[.65] md:bottom-[-40px] md:right-[10%] md:scale-100"
          priority
        />
      </div>

      {/* Content */}
      <section className="container mx-auto px-4 pb-16 pt-10 md:pt-14 lg:pt-20">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center md:min-h-[75vh]">
          <div className="max-w-3xl space-y-4">
            <div className="glass inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span>🎓</span>
              <span>Uma iniciativa do</span>
              <span className="font-semibold text-blue-400">NEI-ISEP</span>
              <span>•</span>
              <span>Instituto Superior de Engenharia do Porto</span>
            </div>
            <h1 className="text-balance text-4xl font-bold sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
              A permuta de turmas,
              <br />
              <span className="text-[#1BAED9]">simplificada</span>
            </h1>
            <div className="pt-4">
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-md bg-white text-black hover:bg-white/90"
                >
                  Quero registar-me
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bands (Figma-style) */}
      <section className="relative border-y border-white/10">
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <Image
            src="/images/lightning.png"
            alt="Lightning"
            width={140}
            height={315}
            className="absolute left-2 top-40 block rotate-[10deg] scale-[.35] animate-drift opacity-60 sm:scale-[.5] md:left-[-40px] md:top-[20%] md:scale-100"
            priority
          />
          <h2 className="text-center text-2xl font-semibold text-[#CFCFCF] sm:text-4xl">
            Permutas simples
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-base text-[#CFCFCF] sm:text-xl">
            Troca de turma para disciplinas específicas de forma rápida e fácil.
          </p>
        </div>
      </section>

      <section className="relative border-b border-white/10">
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <Image
            src="/images/loop-abstract-shape.png"
            alt="Loop"
            width={190}
            height={239}
            className="absolute right-6 top-1/2 hidden -translate-y-1/2 -rotate-[14deg] opacity-80 animate-float md:block"
          />
          <h2 className="text-center text-2xl font-semibold text-[#CFCFCF] sm:text-4xl">
            Permutas completas
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-base text-[#CFCFCF] sm:text-xl">
            Muda todas as disciplinas para uma nova turma de uma só vez.
          </p>
        </div>
      </section>

      <section className="relative border-b border-white/10">
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <Image
            src="/images/diamond-shape.png"
            alt="Diamond"
            width={214}
            height={141}
            className="absolute left-6 top-1/2 hidden -translate-y-1/2 rotate-[9deg] opacity-80 animate-float md:block"
          />
          <h2 className="text-center text-2xl font-semibold text-[#CFCFCF] sm:text-4xl">
            Matches inteligentes
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-base text-[#CFCFCF] sm:text-xl">
            Sistema automático que encontra as melhores permutas para ti.
          </p>
        </div>
      </section>

      {/* How it works */}
      <h3 className="mb-6 text-center text-[40px] font-semibold text-white md:text-[56px]">
        Como funciona?
      </h3>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { n: 1, bold: "Cria", rest: " um pedido" },
          { n: 2, bold: "Aguarda", rest: " pelo match" },
          { n: 3, bold: "Agenda", rest: " a reunião com o DEI" },
        ].map((item) => (
          <div
            key={item.n}
            className="relative flex min-h-[180px] flex-col items-center rounded-[18px] border border-white/20 bg-[#D9D9D9]/[0.14] p-6 md:min-h-[240px] md:p-8"
          >
            <span
              className="absolute bottom-0 right-4 top-0 z-0 select-none text-[320px] font-extrabold leading-none md:bottom-0 md:right-8 md:top-0 md:text-[300px]"
              style={{
                color: "#CFCFCF",
                opacity: 0.22,
                filter: "drop-shadow(0 0 24px rgba(207,207,207,0.11))",
              }}
            >
              {item.n}
            </span>
            <p className="relative z-[1] text-center text-[40px] font-semibold leading-[1.05] md:text-[40px] md:leading-[1.05]">
              <span className="text-[#1BAED9]">{item.bold}</span>
              <span className="text-white">{item.rest}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
