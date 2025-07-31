
"use client";

import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-bold font-headline">Admin Dashboard</h2>
                <p className="text-muted-foreground">Application usage statistics and management.</p>
            </div>
            <AdminDashboard />
        </div>
    );
}
