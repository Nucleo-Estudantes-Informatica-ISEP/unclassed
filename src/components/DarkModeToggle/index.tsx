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
      variant="ghost"
      size="icon"
      onClick={handleThemeToggle}
    >
      <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
    </Button>
  );
};

export default DarkModeToggle;
