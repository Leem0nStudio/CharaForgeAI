
"use client";

import { Header } from "@/components/header";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Loader2 } from "lucide-react";

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
    return children;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
}
