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
      <div className="pointer-events-none absolute inset-0 -z-30" />

      {/* Montage layer (Group 1814) - Desktop */}
      <div className="pointer-events-none absolute inset-x-0 top-[-12vh] -z-20 hidden md:flex justify-center">
        <Image
          src="/images/group-1814.png"
          alt="Geometric montage"
          width={1606}
          height={944}
          className="select-none block"
          priority
        />
      </div>
      
      {/* Montage layer (Group 1814) - Mobile */}
      <div className="pointer-events-none absolute inset-x-0 top-[-12vh] bottom-0 -z-20 flex md:hidden justify-center">
        <Image
          src="/images/group-1814-mobile.png"
          alt="Geometric montage mobile"
          width={800}
          height={600}
          className="select-none block object-cover object-top w-full h-[100vh]"
          priority
          style={{ maxHeight: '100vh' }}
        />
      </div>

      {/* Removed extra floating shapes overlay to keep only section-specific decorations */}

      {/* Content */}
  <section className="w-full pb-16 pt-10 md:pt-14 lg:pt-20">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center md:min-h-[75vh]">
          <div className="max-w-3xl space-y-4">
            <div className="glass inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span>🎓</span>
              <span className="hidden sm:inline">Uma iniciativa do</span>
              <span className="font-semibold text-blue-400">NEI-ISEP</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Instituto Superior de Engenharia do Porto</span>
            </div>
            <h1 className="text-balance text-3xl font-bold sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
              A permuta de turmas,
              <br />
              <span className="text-[#1BAED9]" style={{ textShadow: '0 0 100px rgba(27, 176, 217, 1)' }}>simplificada</span>
            </h1>
            <div className="pt-4">
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-md bg-[#101010] text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90 px-8"
                >
                  Quero registar-me
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bands (Figma-style) */}
      <section className="relative py-10 md:py-14 w-full">
        <div className="absolute inset-x-0 top-0 bottom-0 border-y border-[#101010]/[0.17] dark:border-white/10 -z-10"></div>
        <div className="relative w-full">
          {/* animação removida: animate-drift */}
          <Image
            src="/images/lightning.png"
            alt="Lightning"
            width={140}
            height={315}
            className="hidden sm:block absolute left-2 top-24 rotate-[10deg] scale-[.5] opacity-100 md:left-[-40px] md:top-[20%] md:scale-110 -z-5"
            priority
          />
          <h2 className="relative text-center text-2xl font-semibold text-foreground dark:text-[#CFCFCF] sm:text-4xl z-10">
            Permutas simples
          </h2>
          <p className="relative mx-auto mt-2 max-w-3xl text-center text-base text-foreground dark:text-[#CFCFCF] sm:text-xl z-10">
            Troca de turma para disciplinas específicas de forma rápida e fácil.
          </p>
        </div>
      </section>

      <section className="relative py-10 md:py-14 w-full">
        <div className="absolute inset-x-0 top-0 bottom-0 border-b border-[#101010]/[0.17] dark:border-white/10 -z-10"></div>
        <div className="relative w-full">
          {/* animação removida: animate-float */}
          <Image
            src="/images/loop-abstract-shape.png"
            alt="Loop"
            width={190}
            height={239}
            className="absolute right-6 md:right-[12%] top-1/2 hidden -translate-y-1/2 -rotate-[14deg] opacity-100 md:block md:scale-110 -z-5"
          />
          <h2 className="relative text-center text-2xl font-semibold text-foreground dark:text-[#CFCFCF] sm:text-4xl z-10">
            Permutas completas
          </h2>
          <p className="relative mx-auto mt-2 max-w-3xl text-center text-base text-foreground dark:text-[#CFCFCF] sm:text-xl z-10">
            Muda todas as disciplinas para uma nova turma de uma só vez.
          </p>
        </div>
      </section>

      <section className="relative py-10 md:py-14 w-full">
        <div className="absolute inset-x-0 top-0 bottom-0 border-b border-[#101010]/[0.17] dark:border-white/10 -z-10"></div>
        <div className="relative w-full">
          {/* animação removida: animate-float */}
          <Image
            src="/images/diamond-shape.png"
            alt="Diamond"
            width={214}
            height={141}
            className="absolute left-6 md:left-[10%] top-1/2 hidden -translate-y-1/2 rotate-[9deg] opacity-100 md:block md:scale-110 -z-5"
          />
          <h2 className="relative text-center text-2xl font-semibold text-foreground dark:text-[#CFCFCF] sm:text-4xl z-10">
            Matches inteligentes
          </h2>
          <p className="relative mx-auto mt-2 max-w-3xl text-center text-base text-foreground dark:text-[#CFCFCF] sm:text-xl z-10">
            Sistema automático que encontra as melhores permutas para ti.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-10 md:py-14 w-full">
        <div className="absolute inset-x-0 top-0 bottom-0 border-b border-[#101010]/[0.17] dark:border-white/10 -z-10"></div>
        <div className="relative w-full">
          <h3 className="relative mb-6 text-center text-2xl font-semibold text-[#101010] dark:text-white sm:text-4xl z-10">
            Como funciona?
          </h3>
          <div className="flex overflow-x-auto pb-6 snap-x snap-mandatory md:grid mx-auto max-w-5xl gap-6 md:grid-cols-3">
            {[
              { n: 1, bold: "Cria", rest: " um pedido" },
              { n: 2, bold: "Aguarda", rest: " pelo match" },
              { n: 3, bold: "Agenda", rest: " a reunião com o DEI" },
            ].map((item) => (
              <div
                key={item.n}
                className="snap-center min-w-[280px] shrink-0 md:shrink md:min-w-0 relative flex min-h-[180px] flex-col items-center justify-center rounded-[18px] border border-[#101010]/[0.17] dark:border-[#CFCFCF]/[0.17] bg-[#D9D9D9]/[0.14] p-6 md:min-h-[240px] md:p-8 overflow-hidden"
                style={{ 
                  background: 'radial-gradient(circle at center, rgba(27, 176, 217, 0.05) 0%, transparent 70%)',
                  boxShadow: 'none'
                }}
              >
                <span
                  className="absolute bottom-0 right-4 top-0 z-0 select-none text-[180px] sm:text-[240px] md:text-[300px] font-extrabold leading-none md:bottom-0 md:right-8 md:top-0"
                  style={{
                    color: "#101010",
                    opacity: 0.11,
                    textShadow: "0 0 24px #1010101c",
                  }}
                  // @ts-ignore
                  {...{ 'data-dark': true }}
                >
                  <span className="dark:hidden">{item.n}</span>
                  <span className="hidden dark:inline" style={{
                    color: "#CFCFCF",
                    opacity: 0.22,
                    textShadow: "0 0 24px rgba(207,207,207,0.11)",
                  }}>{item.n}</span>
                </span>
                <p className="relative z-[1] text-center text-[24px] sm:text-[32px] md:text-[40px] font-semibold leading-[1.1] md:leading-[1.05]">
                  <span className="text-[#1BAED9]">{item.bold}</span>
                  <span className="text-[#101010] dark:text-white">{item.rest}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
