import { buttonVariants } from "@/lib/components/ui/button";
import Link from "next/link";
import DarkModeToggle from "../DarkModeToggle";

const Navbar: React.FC = () => {
  return (
    <nav className="h-[8vh] flex items-center justify-between px-8">
      <h2 className="font-bold text-2xl">Permutas</h2>
      <div className="flex items-center justify-center gap-x-4">
        <DarkModeToggle />
        <Link href="/auth/login" className={buttonVariants({ variant: "secondary" })}>Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
