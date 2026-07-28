import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="relative flex items-center justify-center w-full p-4 md:p-8 overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-2xl lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-brand-500/70 to-brand-700/80" />
          <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
            <p className="text-3xl font-bold leading-tight">
              Bem-vindo ao <br />
              <span className="text-white">Unclassed</span>
            </p>
            <p className="mt-4 text-white/85 max-w-sm">
              A plataforma feita por estudantes do NEI-ISEP para simplificar as
              tuas permutas de turma.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="relative mx-auto mt-8 size-32 md:mt-12 md:size-48 flex justify-center items-center lg:hidden">
            <Image
              aria-hidden="true"
              className="block dark:hidden"
              src="/logo/png/dark-no-bg.png"
              alt="Unclassed"
              fill
            />
            <Image
              aria-hidden="true"
              className="hidden dark:block"
              src="/logo/png/light-no-bg.png"
              alt="Unclassed"
              fill
            />
          </div>
          <div className="mt-8 md:mt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
