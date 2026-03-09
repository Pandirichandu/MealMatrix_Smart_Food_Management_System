"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import CreateOwnerModal from "@/components/admin/create-owner-modal";
import EditOwnerModal from "@/components/admin/edit-owner-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Search, UtensilsCrossed, Mail, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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

export default function OwnersPage() {
    const [owners, setOwners] = useState<any[]>([]);
    const [hostels, setHostels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Edit State
    const [editOwner, setEditOwner] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleTerminate = async (id: string) => {
        if (!confirm("Are you sure you want to terminate this contract? This cannot be undone.")) return;
        try {
            await axios.delete(`${API_URL}/api/admin/owners/${id}`, { withCredentials: true });
            toast.success("Contract terminated (Owner removed)");
            setOwners(prev => prev.filter(o => o._id !== id));
        } catch (error) {
            console.error("Termination failed", error);
            toast.error("Failed to terminate contract");
        }
    };

    const handleEdit = (owner: any) => {
        setEditOwner(owner);
        setIsEditOpen(true);
    };

    const fetchData = useCallback(async () => {
        try {
            const driversRes = await axios.get(`${API_URL}/api/admin/owners`, { withCredentials: true });
            const hostelsRes = await axios.get(`${API_URL}/api/admin/hostels`, { withCredentials: true });
            setOwners(driversRes.data);
            setHostels(hostelsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Mess Contractors</h2>
                    <p className="text-muted-foreground">Manage authorized mess owners and their assignments.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <CreateOwnerModal onSuccess={fetchData} />
                    <EditOwnerModal
                        open={isEditOpen}
                        onClose={() => setIsEditOpen(false)}
                        onSuccess={fetchData}
                        owner={editOwner}
                        hostels={hostels}
                    />
                </div>
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Contractor List</CardTitle>
                            <CardDescription>
                                Details of all mess contractors operating within the campus.
                            </CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search owners..."
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
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Business Details</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Assigned Hostel</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Contact Info</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading contractors...</td></tr>
                                ) : owners.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No contractors found.</td></tr>
                                ) : owners.map((owner) => (
                                    <tr key={owner._id} className="border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 data-[state=selected]:bg-muted group">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                                    <ChefHat className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{owner.name}</span>
                                                    <span className="text-xs text-muted-foreground">ID: {owner.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                {owner.hostelId ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        {owner.hostelId.name}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                {owner.email}
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
                                                    <DropdownMenuItem onClick={() => handleEdit(owner)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTerminate(owner._id);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Terminate Contract
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
