
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthActions } from "./auth-actions";
import { AdminHeaderNav } from "./admin-header-nav";

export function Header() {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <header className="py-4 px-4 md:px-8 border-b shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="text-center md:text-left">
        <Link href="/" className="flex items-center justify-center md:justify-start gap-2">
            <h1 className="text-2xl md:text-3xl font-headline font-bold bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">
            CharaForge AI
            </h1>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          Craft unique characters with the power of AI
        </p>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {isAdminPage ? <AdminHeaderNav /> : <AuthActions />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
