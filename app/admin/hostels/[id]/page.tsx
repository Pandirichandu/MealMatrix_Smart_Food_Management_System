"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Users, Building2, User } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

export default function HostelDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [hostel, setHostel] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHostel = async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/hostels/${id}`, { credentials: 'include' });
                if (res.ok) {
                    setHostel(await res.json());
                }
            } catch (error) {
                console.error("Error fetching hostel:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHostel();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading details...</div>;
    if (!hostel) return <div className="p-8 text-center text-red-500">Hostel not found</div>;

    const occupancy = Math.round((hostel.students || 0) / hostel.totalRooms * 100) || 0;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50/50 dark:bg-zinc-950">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Hostel Details</h2>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <Building2 className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">{hostel.name}</CardTitle>
                            <Badge variant={occupancy > 90 ? "destructive" : "secondary"} className="mt-1">
                                {occupancy}% Occupied
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Location
                            </span>
                            <p className="text-base">{hostel.location}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" /> Capacity
                            </span>
                            <p className="text-base">{hostel.totalRooms} Rooms</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" /> Warden
                            </span>
                            <p className="text-base">{hostel.warden || "Not Assigned"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" /> Mess Owner
                            </span>
                            <p className="text-base">{hostel.ownerId?.name || "Unassigned"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
