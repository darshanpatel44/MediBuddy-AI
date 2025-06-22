import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Database, Clock, Shield } from "lucide-react";

export default function Dashboard() {
    const { user } = useUser();
    const userData = useQuery(api.users.getUserByToken,
        user?.id ? { tokenIdentifier: user.id } : "skip"
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
            <Navbar />
            <main className="flex-grow">
                <div className="container mx-auto px-4 py-16">
                    <div className="relative mb-12">
                        <div className="absolute inset-x-0 -top-16 -bottom-16 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
                        <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight mb-4">Your Dashboard</h1>
                        <p className="text-xl text-[#86868B] max-w-[600px] leading-relaxed mb-8">
                            View and manage your account information and user data in one place.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Clerk User Data */}
                        <DataCard 
                            title="Clerk User Information"
                            icon={<User className="h-5 w-5 text-[#0066CC]" />}
                        >
                            <div className="space-y-2">
                                <DataRow label="Full Name" value={user?.fullName} />
                                <DataRow label="Email" value={user?.primaryEmailAddress?.emailAddress} />
                                <DataRow label="User ID" value={user?.id} />
                                <DataRow label="Created" value={new Date(user?.createdAt || "").toLocaleDateString()} />
                                <DataRow
                                    label="Email Verified"
                                    value={user?.primaryEmailAddress?.verification.status === "verified" ? "Yes" : "No"}
                                />
                            </div>
                        </DataCard>

                        {/* Database User Data */}
                        <DataCard 
                            title="Database User Information"
                            icon={<Database className="h-5 w-5 text-[#0066CC]" />}
                        >
                            <div className="space-y-2">
                                <DataRow label="Database ID" value={userData?._id} />
                                <DataRow label="Name" value={userData?.name} />
                                <DataRow label="Email" value={userData?.email} />
                                <DataRow label="Token ID" value={userData?.tokenIdentifier} />
                                <DataRow
                                    label="Last Updated"
                                    value={userData?._creationTime ? new Date(userData._creationTime).toLocaleDateString() : undefined}
                                />
                            </div>
                        </DataCard>

                        {/* Session Information */}
                        <DataCard 
                            title="Current Session"
                            icon={<Clock className="h-5 w-5 text-[#0066CC]" />}
                        >
                            <div className="space-y-2">
                                <DataRow label="Last Active" value={new Date(user?.lastSignInAt || "").toLocaleString()} />
                                <DataRow label="Auth Strategy" value={user?.primaryEmailAddress?.verification.strategy} />
                            </div>
                        </DataCard>

                        {/* Additional User Details */}
                        <DataCard 
                            title="Profile Details"
                            icon={<Shield className="h-5 w-5 text-[#0066CC]" />}
                        >
                            <div className="space-y-2">
                                <DataRow label="Username" value={user?.username} />
                                <DataRow label="First Name" value={user?.firstName} />
                                <DataRow label="Last Name" value={user?.lastName} />
                                <DataRow
                                    label="Profile Image"
                                    value={user?.imageUrl ? "Available" : "Not Set"}
                                />
                            </div>
                        </DataCard>
                    </div>
                    
                    {/* JSON Data Preview */}
                    <div className="mt-12">
                        <DataCard 
                            title="Raw Data Preview"
                            className="bg-gradient-to-br from-[#F5F5F7] to-white"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-[#1D1D1F] mb-2">Clerk User Data</h3>
                                    <pre className="bg-white/80 p-4 rounded-[14px] text-sm overflow-auto max-h-64 border border-[#E5E5EA]">
                                        {JSON.stringify(user, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-[#1D1D1F] mb-2">Database User Data</h3>
                                    <pre className="bg-white/80 p-4 rounded-[14px] text-sm overflow-auto max-h-64 border border-[#E5E5EA]">
                                        {JSON.stringify(userData, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </DataCard>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}

function DataCard({ 
    title, 
    children, 
    icon, 
    className = ""
}: { 
    title: string; 
    children: React.ReactNode; 
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`bg-white rounded-[20px] shadow-sm p-6 transition-all hover:shadow-md ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                {icon && <div className="flex-shrink-0">{icon}</div>}
                <h2 className="text-lg font-semibold text-[#1D1D1F]">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function DataRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="flex justify-between py-2 border-b border-[#F5F5F7] last:border-0">
            <span className="text-[#86868B]">{label}</span>
            <span className="text-[#1D1D1F] font-medium">{value || "—"}</span>
        </div>
    );
}

function formatDate(timestamp: number | undefined) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString();
}

function formatCurrency(amount: number | undefined, currency: string = "USD") {
    if (amount === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
    }).format(amount / 100);
}

function StatusBadge({ status }: { status: string | undefined }) {
    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case "active":
                return "bg-[#E3F2E3] text-[#1D8A1D]";
            case "canceled":
                return "bg-[#FFEAEA] text-[#D93025]";
            default:
                return "bg-[#F5F5F7] text-[#86868B]";
        }
    };

    return (
        <span className={`px-3 py-1 rounded-[14px] text-sm font-medium ${getStatusColor(status)}`}>
            {status || "No status"}
        </span>
    );
}