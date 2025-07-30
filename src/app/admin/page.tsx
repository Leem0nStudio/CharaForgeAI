"use client";

import { Header } from "@/components/header";
import { AdminDashboard } from "@/components/admin-dashboard";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AdminPage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="p-4 md:p-8">
                 <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-headline">Admin Panel</h2>
                    <p className="text-muted-foreground">Application usage statistics and management.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p>Loading...</p>
                    </div>
                ) : user ? (
                    <AdminDashboard />
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold">Access Denied</h2>
                        <p className="text-muted-foreground mt-2">
                            You must be an administrator to view this page.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
