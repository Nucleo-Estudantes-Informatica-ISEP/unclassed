import Link from "next/link";

import { buttonVariants } from "@/lib/components/ui/button";

import DarkModeToggle from "../DarkModeToggle";

const Navbar: React.FC = () => {
  return (
    <nav className="flex h-[8vh] items-center justify-between px-8">
      <h2 className="text-2xl font-bold">Permutas</h2>
      <div className="flex items-center justify-center gap-x-4">
        <DarkModeToggle />
        <Link
          href="/auth/login"
          className={buttonVariants({ variant: "secondary" })}
        >
          Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
