"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function OwnerStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchStudents = async (searchQuery = "") => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/owner/students`, {
                params: { search: searchQuery },
                withCredentials: true
            });
            setStudents(res.data.students);
            setTotalStudents(res.data.totalStudents);
        } catch (err) {
            console.error("Failed to fetch students", err);
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleStatusToggle = async (studentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        // Optimistic Update
        setStudents(prev => prev.map(s =>
            s._id === studentId ? { ...s, status: newStatus } : s
        ));

        try {
            await axios.patch(`${API_URL}/api/owner/students/${studentId}/status`,
                { status: newStatus },
                { withCredentials: true }
            );
            toast.success(`Student marked as ${newStatus.toUpperCase()}`);
        } catch (error) {
            console.error("Status Update Failed", error);
            toast.error("Failed to update status");
            // Revert
            setStudents(prev => prev.map(s =>
                s._id === studentId ? { ...s, status: currentStatus } : s
            ));
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Assigned Students</h2>
                    <p className="text-muted-foreground">Total Students: {totalStudents}</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, roll no..."
                        className="pl-8 w-[250px]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">No students found.</div>
                ) : (
                    students.map(student => (
                        <Card key={student._id} className="w-full hover:shadow-md transition-shadow border-slate-200 dark:border-zinc-800">
                            <CardContent className="flex items-center justify-between p-4 gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shrink-0 ${student.status === 'inactive'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-primary/10 text-primary'
                                        }`}>
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`font-medium truncate ${student.status === 'inactive' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                            {student.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{student.studentId || "No Roll No"}</p>
                                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-2">
                                    <Badge variant={student.status === 'active' ? 'default' : 'destructive'} className="capitalize whitespace-nowrap">
                                        {student.status || 'Active'}
                                    </Badge>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            {student.status === 'active' ? 'Active' : 'Locked'}
                                        </span>
                                        <Switch
                                            checked={student.status === 'active'}
                                            onCheckedChange={() => handleStatusToggle(student._id, student.status || 'active')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
