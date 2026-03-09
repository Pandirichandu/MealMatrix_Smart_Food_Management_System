"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";

interface EditOwnerModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    owner: any;
    hostels: any[];
}

export default function EditOwnerModal({ open, onClose, onSuccess, owner, hostels }: EditOwnerModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        hostelId: ""
    });

    useEffect(() => {
        if (owner) {
            setFormData({
                name: owner.name || "",
                email: owner.email || "",
                hostelId: owner.hostelId ? owner.hostelId._id : "unassigned"
            });
        }
    }, [owner]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!owner) return;
        setLoading(true);

        try {
            await axios.put(`${API_URL}/api/admin/owners/${owner._id}`, formData, {
                withCredentials: true,
            });
            toast.success("Owner updated successfully!");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.msg || "Failed to update owner.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Mess Owner</DialogTitle>
                    <DialogDescription>
                        Update details for mess contractor.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Business/Owner Name</Label>
                        <Input id="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hostel">Assigned Hostel</Label>
                        <Select
                            value={formData.hostelId}
                            onValueChange={(val) => setFormData({ ...formData, hostelId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Hostel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {hostels
                                    .filter(h =>
                                        !h.ownerId || // No owner assigned
                                        (owner && h.ownerId._id === owner._id) // Currently assigned to this owner
                                    )
                                    .map((hostel) => (
                                        <SelectItem key={hostel._id} value={hostel._id}>
                                            {hostel.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Assigning a hostel will automatically update the hostel's record.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
