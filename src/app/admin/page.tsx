
"use client";

import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
    return (
        <>
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold font-headline">Admin Panel</h2>
                <p className="text-muted-foreground">Application usage statistics and management.</p>
            </div>
            <AdminDashboard />
        </>
    );
}
