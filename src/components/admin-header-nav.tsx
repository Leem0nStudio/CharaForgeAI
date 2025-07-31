
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PackagePlus, ArrowLeft } from "lucide-react";
import { UserNav } from "./user-nav";

const menuItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/datapacks",
    label: "DataPacks",
    icon: PackagePlus,
  },
];

export function AdminHeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
       <Button variant="outline" size="sm" asChild>
          <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Admin
          </Link>
      </Button>
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
      <UserNav />
    </nav>
  );
}
