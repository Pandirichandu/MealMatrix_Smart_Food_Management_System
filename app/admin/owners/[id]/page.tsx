"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, ChefHat, Building2, Calendar } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

export default function OwnerDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [owner, setOwner] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOwner = async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/owners/${id}`, { credentials: 'include' });
                if (res.ok) {
                    setOwner(await res.json());
                }
            } catch (error) {
                console.error("Error fetching owner:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOwner();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading details...</div>;
    if (!owner) return <div className="p-8 text-center text-red-500">Owner not found</div>;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50/50 dark:bg-zinc-950">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Contractor Details</h2>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <ChefHat className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">{owner.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">Mess Contractor</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Email
                            </span>
                            <p className="text-base">{owner.email}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4" /> Assigned Hostel
                            </span>
                            <p className="text-base">{owner.hostelId?.name || "Unassigned"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Joined
                            </span>
                            <p className="text-base">{new Date(owner.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
