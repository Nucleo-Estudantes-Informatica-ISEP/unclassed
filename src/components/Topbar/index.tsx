import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { config } from "@/config";
import { buttonVariants } from "@/lib/components/ui/button";

import DarkModeToggle from "../DarkModeToggle";

const Topbar: React.FC = () => {
  const token = cookies().get(config.cookies.token)?.value;

  return (
    <nav className="flex h-[12vh] items-center justify-between px-8">
      <Link href="/" className="flex items-center gap-x-1">
        <div className="relative size-8 md:size-12">
          <Image
            className="block dark:hidden"
            src="/logo/png/icon-dark.png"
            alt="ISEP"
            fill
          />
          <Image
            className="hidden dark:block"
            src="/logo/png/icon-light.png"
            alt="ISEP"
            fill
          />
        </div>
        <h2 className="font-poppins text-lg font-black uppercase md:text-xl">
          nclassed
        </h2>
      </Link>
      <div className="flex items-center justify-center gap-x-4">
        <DarkModeToggle />
        {!token && (
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary" })}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Topbar;
