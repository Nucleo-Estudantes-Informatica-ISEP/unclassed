import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center">
      <div className=" mx-auto flex h-full max-w-4xl flex-1 flex-col items-center justify-center rounded-lg bg-white shadow-xl lg:flex-row">
        <div className="relative min-h-32 w-full lg:h-full lg:w-1/2">
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
