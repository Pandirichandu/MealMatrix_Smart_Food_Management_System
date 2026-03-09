"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import CreateStudentModal from "@/components/admin/create-student-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, MoreHorizontal, ShieldCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [hostels, setHostels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHostel, setSelectedHostel] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this student?")) return;
        try {
            await axios.delete(`${API_URL}/api/admin/students/${id}`, { withCredentials: true });
            toast.success("Student removed successfully");
            setStudents(prev => prev.filter(s => s._id !== id));
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to remove student");
        }
    };

    const fetchHostels = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/hostels`, { withCredentials: true });
            setHostels(res.data);
        } catch (error) {
            console.error("Failed to fetch hostels", error);
        }
    }, []);

    const fetchStudents = useCallback(async (hostelId: string) => {
        try {
            setLoading(true);
            const params: any = {};
            if (hostelId !== "all") {
                params.hostelId = hostelId;
            }
            const res = await axios.get(`${API_URL}/api/admin/students`, { params, withCredentials: true });
            setStudents(res.data);
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHostels();
    }, [fetchHostels]);

    useEffect(() => {
        fetchStudents(selectedHostel);
    }, [selectedHostel, fetchStudents]);

    const filteredStudents = students.filter(student => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            student.name?.toLowerCase().includes(q) ||
            student.studentId?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Student Records</h2>
                    <p className="text-muted-foreground">Directory of all students and their statuses.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <CreateStudentModal onSuccess={() => fetchStudents(selectedHostel)} hostels={hostels} />
                </div>
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>All Students</CardTitle>
                            <CardDescription>
                                Search and manage student meal subscriptions.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={selectedHostel} onValueChange={setSelectedHostel}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-gray-50 dark:bg-zinc-900">
                                    <SelectValue placeholder="All Hostels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Hostels</SelectItem>
                                    {hostels.map((hostel: any) => (
                                        <SelectItem key={hostel._id} value={hostel._id}>
                                            {hostel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search by name or roll no..."
                                    className="pl-9 w-full sm:w-[250px] bg-gray-50 dark:bg-zinc-900"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-gray-50/50 dark:bg-zinc-900/50">
                                <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Student Details</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Roll No</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Hostel</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading student data...</td></tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found.</td></tr>
                                ) : filteredStudents.map((student) => (
                                    <tr key={student._id} className="border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 data-[state=selected]:bg-muted group">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shrink-0 ${student.status === 'inactive'
                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                                    : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300'
                                                    }`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold ${student.status === 'inactive' ? 'text-muted-foreground line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                                        {student.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Engineering</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <Badge variant="outline" className="font-mono bg-white dark:bg-zinc-900">
                                                {student.studentId || "N/A"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={student.status === 'active'}
                                                    onCheckedChange={async () => {
                                                        const newStatus = student.status === 'active' ? 'inactive' : 'active';
                                                        // Optimistic
                                                        const originalStatus = student.status;
                                                        setStudents(prev => prev.map(s => s._id === student._id ? { ...s, status: newStatus } : s));
                                                        try {
                                                            await axios.patch(`${API_URL}/api/admin/students/${student._id}/status`, { status: newStatus }, { withCredentials: true });
                                                            toast.success(`Student ${newStatus.toUpperCase()}`);
                                                        } catch (err) {
                                                            toast.error("Failed to update status");
                                                            setStudents(prev => prev.map(s => s._id === student._id ? { ...s, status: originalStatus } : s));
                                                        }
                                                    }}
                                                />
                                                <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                    {student.status || 'Active'}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                                <span className="font-medium">{student.hostelId?.name || "Unassigned"}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(student.studentId)}>
                                                        Copy Roll No
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => router.push(`/admin/students/${student._id}`)}>
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(student._id);
                                                        }}
                                                    >
                                                        Remove Student
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
