"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Search, User, Users, Plus, Loader2, MoreHorizontal, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HostelsPage() {
    const [hostels, setHostels] = useState<any[]>([]);
    const [owners, setOwners] = useState<any[]>([]);
    const [ratings, setRatings] = useState<any[]>([]); // Added
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleDeleteHostel = async (id: string) => {
        if (!confirm("Are you sure you want to delete this hostel?")) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/hostels/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || "Delete failed");

            toast.success("Hostel deleted successfully");
            setHostels(prev => prev.filter(h => h._id !== id));
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.message || "Failed to delete hostel");
        }
    };

    // Form State
    const [selectedHostel, setSelectedHostel] = useState<any>(null); // For Edit Mode
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        totalRooms: "",
        ownerId: ""
    });

    const fetchHostels = useCallback(async () => {
        try {
            const [hostelRes, ratingRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/hostels`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/hostels/ratings`, { credentials: 'include' })
            ]);

            const hostelData = await hostelRes.json();
            const ratingData = await ratingRes.json();

            setHostels(hostelData);
            setRatings(ratingData);
        } catch (err) {
            console.error("Failed to fetch data", err);
            toast.error("Failed to load data");
        }
    }, []);

    const fetchOwners = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/owners`, {
                credentials: 'include'
            });
            const data = await res.json();
            setOwners(data);
        } catch (err) {
            console.error("Failed to fetch owners", err);
        }
    }, []);

    useEffect(() => {
        fetchHostels();
        fetchOwners();
    }, [fetchHostels, fetchOwners]);

    // Helper to get rating
    const getHostelRating = (hostelId: string) => {
        const rating = ratings.find(r => r.hostelId === hostelId);
        return rating ? rating : { averageRating: 0, totalReviews: 0 };
    };

    const handleOpenEdit = (hostel: any) => {
        setSelectedHostel(hostel);
        setFormData({
            name: hostel.name,
            location: hostel.location,
            totalRooms: hostel.totalRooms?.toString() || "",
            ownerId: hostel.ownerId?._id || "unassigned"
        });
        setIsDialogOpen(true);
    };

    const handleOpenCreate = () => {
        setSelectedHostel(null);
        setFormData({ name: "", location: "", totalRooms: "", ownerId: "unassigned" });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!formData.name || !formData.location || !formData.totalRooms) {
            toast.error("Please fill all fields");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                location: formData.location,
                totalRooms: parseInt(formData.totalRooms),
                ownerId: formData.ownerId
            };

            let res;
            if (selectedHostel) {
                // EDIT HOSTEL
                res = await fetch(`${API_URL}/api/admin/hostels/${selectedHostel._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });
            } else {
                // CREATE HOSTEL
                res = await fetch(`${API_URL}/api/admin/hostels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || "Operation failed");

            toast.success(selectedHostel ? "Hostel updated successfully!" : "Hostel created successfully!");

            setFormData({ name: "", location: "", totalRooms: "", ownerId: "" });
            setIsDialogOpen(false);
            fetchHostels();
            fetchOwners();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get owner name safely from populated ID
    const getOwnerName = (owner: any) => {
        return owner?.name || "Unassigned";
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50 dark:bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Hostel Management</h2>
                    <p className="text-muted-foreground">Manage campus hostels and their mess contractors.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg shadow-primary/20" onClick={handleOpenCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Add New Hostel
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{selectedHostel ? "Edit Hostel" : "Add New Hostel"}</DialogTitle>
                                <DialogDescription>
                                    {selectedHostel ? "Update hostel details and mess owner assignment." : "Create a new hostel and assign a mess owner."}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. Block A"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="location" className="text-right">
                                        Location
                                    </Label>
                                    <Input
                                        id="location"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. North Campus"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="capacity" className="text-right">
                                        Capacity
                                    </Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        min="0"
                                        value={formData.totalRooms}
                                        onChange={(e) => setFormData({ ...formData, totalRooms: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Total Students"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="owner" className="text-right">
                                        Owner (Optional)
                                    </Label>
                                    <Select
                                        value={formData.ownerId}
                                        onValueChange={(val) => setFormData({ ...formData, ownerId: val })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Mess Owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                            {owners
                                                // Correct logic: Show Unassigned Owners OR Currently Assigned Owner (if editing)
                                                .filter(o =>
                                                    !o.assignedHostel || // Unassigned
                                                    (selectedHostel && o.assignedHostel._id === selectedHostel._id) // Current assigned
                                                )
                                                .map((owner) => (
                                                    <SelectItem key={owner._id} value={owner._id}>
                                                        {owner.name} ({owner.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {selectedHostel ? "Save Changes" : "Create Hostel"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Registered Hostels</CardTitle>
                            <CardDescription>
                                A list of all hostels including their capacity, warden, and assigned mess owner.
                            </CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search hostels..."
                                className="pl-9 w-full md:w-[250px] bg-gray-50 dark:bg-zinc-900"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-gray-50/50 dark:bg-zinc-900/50">
                                <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Hostel Name</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Warden</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Rating</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Occupancy</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Mess Owner</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {hostels.map((hostel) => (
                                    <tr key={hostel._id} className="border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 data-[state=selected]:bg-muted group">
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{hostel.name}</span>
                                                    <span className="text-xs text-muted-foreground">{hostel.location || "Main Campus"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {hostel.warden}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {(() => {
                                                const stats = getHostelRating(hostel._id);
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-100 dark:border-yellow-800">
                                                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 mr-1" />
                                                            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">
                                                                {stats.averageRating > 0 ? stats.averageRating : "-"}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            ({stats.totalReviews})
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="w-[140px]">
                                                {(() => {
                                                    const capacity = hostel.totalRooms || 0;
                                                    // Use 'occupied' from API, fallback to 'students' (legacy), then 0
                                                    const occupied = (hostel.occupied !== undefined && hostel.occupied !== null) ? hostel.occupied : (hostel.students || 0);

                                                    if (capacity <= 0) {
                                                        return <span className="text-xs text-muted-foreground">Capacity Not Set</span>;
                                                    }

                                                    let occupancy = 0;
                                                    if (capacity > 0) {
                                                        occupancy = (occupied / capacity) * 100;
                                                    }

                                                    const safeOccupancy = Number.isFinite(occupancy) ? Math.round(occupancy) : 0;

                                                    return (
                                                        <>
                                                            <div className="flex items-center justify-between text-xs mb-1">
                                                                <span className="text-muted-foreground flex items-center gap-1">
                                                                    <Users className="h-3 w-3" />
                                                                    {occupied} / {capacity}
                                                                </span>
                                                                <span className="font-medium text-primary">
                                                                    {safeOccupancy}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${safeOccupancy > 90 ? 'bg-red-500' : 'bg-green-500'}`}
                                                                    style={{ width: `${safeOccupancy}%` }}
                                                                />
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {hostel.ownerId ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    {hostel.ownerId.name}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                                                ${hostel.status === 'Active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {hostel.status}
                                            </span>
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
                                                    <DropdownMenuItem onClick={() => handleOpenEdit(hostel)}>
                                                        Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteHostel(hostel._id);
                                                        }}
                                                    >
                                                        Delete Hostel
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
