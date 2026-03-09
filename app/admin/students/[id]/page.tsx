"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Hash, Building2, Calendar } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { AttendanceHistory } from "@/components/dashboard/attendance-history";

export default function StudentDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/students/${id}`, { credentials: 'include' });
                if (res.ok) {
                    setStudent(await res.json());
                }
            } catch (error) {
                console.error("Error fetching student:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudent();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading details...</div>;
    if (!student) return <div className="p-8 text-center text-red-500">Student not found</div>;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50/50 dark:bg-zinc-950">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Student Details</h2>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <CardTitle className="text-xl">{student.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1">{student.role}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Email
                            </span>
                            <p className="text-base">{student.email}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Hash className="h-4 w-4" /> Roll Number/ID
                            </span>
                            <p className="text-base">{student.studentId || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4" /> Hostel
                            </span>
                            <p className="text-base">{student.hostelId?.name || "Unassigned"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Joined
                            </span>
                            <p className="text-base">{new Date(student.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {/* Attendance History Section */}
            <div className="pt-4">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Attendance History</h3>
                <AttendanceHistory studentId={student._id} />
            </div>
        </div>
    );
}
