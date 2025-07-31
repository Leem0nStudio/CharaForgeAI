
"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Loader2, PanelLeft } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminNav } from "@/components/admin-nav";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!user || !isAdmin) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You must be an administrator to view this page.
          </p>
        </div>
      );
    }
    
    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <AdminNav />
          </Sidebar>
          <div className="flex-1">
            <main className="p-4 md:p-8">
              <div className="md:hidden flex items-center mb-4">
                 <SidebarTrigger />
                 <span className="font-semibold ml-2">Admin Menu</span>
              </div>
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    )
  };

  return (
    <div className="bg-background text-foreground">
      <Header />
      {renderContent()}
    </div>
  );
}
