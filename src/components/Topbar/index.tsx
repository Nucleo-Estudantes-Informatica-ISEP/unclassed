import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { config } from "@/config";
import { buttonVariants } from "@/lib/components/ui/button";
import getServerSession from "@/services/getServerSession";

import DarkModeToggle from "../DarkModeToggle";
import UserMenu from "./UserMenu";

const Topbar: React.FC = async () => {
  const token = cookies().get(config.cookies.auth.name)?.value;
  const session = token ? await getServerSession() : null;

  return (
    <nav className="absolute top-0 flex h-[12vh] w-full items-center justify-between px-8">
      <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-x-2">
        <Image
          src="/images/unclassed-black.svg"
          alt="Unclassed Logo"
          width={120}
          height={32}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/images/unclassed-white.svg"
          alt="Unclassed Logo"
          width={120}
          height={32}
          className="hidden dark:block"
          priority
        />
      </Link>
      <div className="flex items-center justify-center gap-x-4">
        <DarkModeToggle />
        {session ? (
          <>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline" })}
            >
              Dashboard
            </Link>
            <Link
              href="/swap-requests"
              className={buttonVariants({ variant: "outline" })}
            >
              Criar Pedido
            </Link>
            <Link
              href="/matches"
              className={buttonVariants({ variant: "outline" })}
            >
              Meus Matches
            </Link>
            <UserMenu user={session} />
          </>
        ) : (
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
