"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LayoutDashboard, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full p-2">
        <SidebarMenu>
        {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
            <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                    <SidebarMenuButton 
                        variant="ghost" 
                        isActive={isActive}
                        className={cn("w-full justify-start", isActive && "bg-primary/10 text-primary")}
                    >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            );
        })}
        </SidebarMenu>
    </div>
  );
}
