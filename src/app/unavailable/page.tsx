import Image from "next/image";
import Link from "next/link";

const UnavailablePage: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradients + grid (deep layer) */}
      <div className="pointer-events-none absolute inset-0 -z-30" />

      {/* Montage layer (Group 1814) - Desktop */}
      <div className="pointer-events-none absolute inset-x-0 -top-vh-12 -z-20 hidden justify-center md:flex">
        <Image
          src="/images/group-1814.png"
          alt="Geometric montage"
          width={1606}
          height={944}
          className="block select-none opacity-50"
          priority
        />
      </div>

      {/* Montage layer (Group 1814) - Mobile */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -top-vh-12 -z-20 flex justify-center md:hidden">
        <Image
          src="/images/group-1814-mobile.png"
          alt="Geometric montage mobile"
          width={800}
          height={600}
          className="block h-[100vh] w-full select-none object-cover object-top opacity-50"
          priority
          style={{ maxHeight: "100vh" }}
        />
      </div>

      {/* Content */}
      <section className="w-full pb-16 pt-10 md:pt-14 lg:pt-20">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center md:min-h-[75vh]">
          <div className="max-w-3xl space-y-4">
            <div className="glass inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span>🎓</span>
              <span className="hidden sm:inline">Uma iniciativa do</span>
              <span className="font-semibold text-blue-400">NEI-ISEP</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Instituto Superior de Engenharia do Porto
              </span>
            </div>
            <h1 className="text-balance text-3xl font-bold sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
              A permuta de turmas
              <br />
              <span
                className="text-[#1BAED9]"
                style={{ textShadow: "0 0 100px rgba(27, 176, 217, 1)" }}
              >
                não está disponível
              </span>
              <br />
              de momento.
            </h1>
            <p className="pt-4 text-lg text-muted-foreground">
              O sistema encontra-se temporariamente indisponível.
              <br />
              Por favor, tenta novamente mais tarde.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UnavailablePage;