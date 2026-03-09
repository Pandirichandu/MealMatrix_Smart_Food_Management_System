"use client";

import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, EyeOff } from "lucide-react";

interface CreateStudentModalProps {
    onSuccess: () => void;
    hostels: any[]; // List of hostels to select from
}

export default function CreateStudentModal({ onSuccess, hostels }: CreateStudentModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        studentId: "",
        hostelId: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post("http://localhost:5003/api/admin/students", formData, {
                withCredentials: true,
            });
            toast.success("Student created successfully!");
            setOpen(false);
            onSuccess(); // Refresh list
            setFormData({ name: "", email: "", password: "", studentId: "", hostelId: "" });
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.msg || "Failed to create student.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>
                        Create a new student account. They will be required to change their password on first login.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="studentId">Roll ID</Label>
                            <Input id="studentId" value={formData.studentId} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Initial Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="sr-only">
                                    {showPassword ? "Hide password" : "Show password"}
                                </span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hostelId">Assigned Hostel</Label>
                        <Select onValueChange={(val: string) => setFormData({ ...formData, hostelId: val })} value={formData.hostelId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Hostel" />
                            </SelectTrigger>
                            <SelectContent>
                                {hostels.map((hostel) => {
                                    const capacity = hostel.totalRooms || 0;
                                    const occupied = hostel.students || 0; // Assuming API returns students count in list
                                    const isFull = capacity > 0 && occupied >= capacity;

                                    return (
                                        <SelectItem
                                            key={hostel._id}
                                            value={hostel._id}
                                            disabled={isFull}
                                        >
                                            {hostel.name} {isFull ? '(Full)' : ''}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
