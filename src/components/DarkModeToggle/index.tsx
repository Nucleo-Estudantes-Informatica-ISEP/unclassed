"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/lib/components/ui/button";

import { useTheme } from "next-themes";

const DarkModeToggle: React.FC = () => {
  const { setTheme, theme } = useTheme();

  function handleThemeToggle() {
    if (theme === "dark") setTheme("light");
    else setTheme("dark");
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleThemeToggle}
      className="border-[#101010]/30 dark:border-[#CFCFCF]/30"
    >
      <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[#101010]/30 dark:text-[#CFCFCF]/30" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[#101010]/30 dark:text-[#CFCFCF]/30" />
    </Button>
  );
};

export default DarkModeToggle;
