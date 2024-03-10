import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { config } from "@/config";
import { buttonVariants } from "@/lib/components/ui/button";

import DarkModeToggle from "../DarkModeToggle";

const Topbar: React.FC = () => {
  const token = cookies().get(config.cookies.token)?.value;
  console.log(token);

  return (
    <nav className="flex h-[8vh] items-center justify-between px-8">
      <div className="flex items-center gap-x-1">
        <Image
          className="block dark:hidden"
          src="/logo/png/icon-dark.png"
          alt="ISEP"
          width={30}
          height={30}
        />
        <Image
          className="hidden dark:block"
          src="/logo/png/icon-light.png"
          alt="ISEP"
          width={30}
          height={30}
        />
        <h2 className="font-poppins text-xl font-black uppercase">nclassed</h2>
      </div>
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
