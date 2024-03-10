import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex size-full items-center justify-center">
      <div className="mx-8 grid min-h-[420px] max-w-4xl flex-1 grid-cols-2 flex-col items-center justify-center rounded-lg bg-white shadow-xl dark:bg-zinc-900 lg:flex-row">
        <div className="relative mt-4 size-24 lg:m-16 lg:size-72">
          <Image
            aria-hidden="true"
            className="block dark:hidden"
            src="/logo/png/dark-no-bg.png"
            alt="Office"
            fill
          />
          <Image
            aria-hidden="true"
            className="hidden dark:block"
            src="/logo/png/light-no-bg.png"
            alt="Office"
            fill
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
