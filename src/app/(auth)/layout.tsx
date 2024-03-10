import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex min-h-[420px] max-w-4xl flex-1 flex-col items-center justify-center rounded-lg bg-white shadow-xl dark:bg-zinc-900 lg:flex-row">
        <div className="relative h-32 w-full lg:h-full lg:w-1/2">
          <Image
            aria-hidden="true"
            fill
            className="object-cover"
            src="/images/isep.jpg"
            alt="Office"
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
