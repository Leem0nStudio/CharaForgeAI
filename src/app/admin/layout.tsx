
"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminNav } from "@/components/admin-nav";
import { Header } from "@/components/header";

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
            <div className="flex">
                <Sidebar>
                    <AdminNav />
                </Sidebar>
                <main className="flex-1 p-4 md:p-8">
                     {children}
                </main>
            </div>
        </SidebarProvider>
    )
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      {renderContent()}
    </div>
  );
}
