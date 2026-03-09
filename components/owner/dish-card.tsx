"use client";

import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Image as ImageIcon, Loader2, AlertCircle, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { API_URL } from "@/lib/config";

const CATEGORIES = ["Main", "Breads", "Rice", "Beverages", "Dessert", "Snacks"];

export interface FoodItem {
    _id: string;
    uiId?: string; // For menu builder
    foodName: string;
    imageUrl: string;
    category: string;
    vegOrNonVeg: 'veg' | 'non-veg';
    price: number;
    isCustomDish?: boolean;
    maxQuantity?: number;
}

interface DishCardProps {
    item: FoodItem;
    mode?: 'normal' | 'edit' | 'delete';
    onUpdate?: (updatedDish: FoodItem) => void;
    onDelete?: (dishId: string) => void;
}

export function DishCard({ item, mode = 'normal', onUpdate, onDelete }: DishCardProps) {
    console.log(`[DishCard Mounted] Name: ${item.foodName} | Mode: ${mode} | isCustomDish: ${item.isCustomDish}`);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [editForm, setEditForm] = useState({
        foodName: item.foodName,
        category: item.category,
        vegOrNonVeg: item.vegOrNonVeg,
        price: item.price
    });
    const [uploadImage, setUploadImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset internal state if mode changes (e.g. from edit -> normal -> edit)
    useEffect(() => {
        if (mode !== 'edit') {
            setEditForm({
                foodName: item.foodName,
                category: item.category,
                vegOrNonVeg: item.vegOrNonVeg,
                price: item.price
            });
            setUploadImage(null);
        }
        if (mode !== 'delete') {
            setConfirmDelete(false);
        }
    }, [mode, item]);

    const handleEditSave = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card clicks if wrapped
        if (!editForm.foodName.trim()) {
            toast.error("Dish name is required");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('foodName', editForm.foodName);
            formData.append('category', editForm.category);
            formData.append('vegOrNonVeg', editForm.vegOrNonVeg);
            formData.append('price', String(editForm.price));

            if (uploadImage) {
                formData.append('image', uploadImage);
            }

            const res = await axios.put(`${API_URL}/api/owner/dishes/${item._id}`, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Dish updated successfully!");
            if (onUpdate) onUpdate(res.data);
            setUploadImage(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Failed to update dish.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card selection logic
        setConfirmDelete(true);
    };

    const handleDeleteConfirm = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleting(true);
        try {
            await axios.delete(`${API_URL}/api/owner/dishes/${item._id}`, {
                withCredentials: true
            });
            toast.success("Dish deleted successfully.");
            if (onDelete) onDelete(item._id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Failed to delete dish.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadImage(null);
        setEditForm({
            foodName: item.foodName,
            category: item.category,
            vegOrNonVeg: item.vegOrNonVeg,
            price: item.price
        });
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete(false);
    }

    if (mode === 'edit' && item.isCustomDish) {
        return (
            <Card className="overflow-hidden flex flex-col border-primary/40 ring-2 ring-primary/20 shadow-md">
                {/* Img Preview Edit Area */}
                <div
                    className="relative h-32 w-full bg-muted group cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) setUploadImage(e.target.files[0]);
                        }}
                    />
                    {uploadImage ? (
                        <img src={URL.createObjectURL(uploadImage)} className="w-full h-full object-cover opacity-80" alt="Preview" />
                    ) : (
                        <img src={item.imageUrl || '/menu-images/placeholder.jpg'} className="w-full h-full object-cover opacity-80" alt="Current" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col items-center text-white">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">Change Image</span>
                        </div>
                    </div>
                </div>

                {/* Edit Form Body */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-xs text-muted-foreground">Dish Name</Label>
                        <Input
                            value={editForm.foodName}
                            onChange={(e) => setEditForm(prev => ({ ...prev, foodName: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <Select value={editForm.category} onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Select value={editForm.vegOrNonVeg} onValueChange={(v: 'veg' | 'non-veg') => setEditForm(prev => ({ ...prev, vegOrNonVeg: v }))}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="veg">Veg</SelectItem>
                                    <SelectItem value="non-veg">Non-Veg</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t">
                        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleCancelEdit} disabled={isSaving}>
                            <X className="w-4 h-4 mr-1" /> Revert
                        </Button>
                        <Button type="button" size="sm" className="flex-1" onClick={handleEditSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                            Save
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (mode === 'delete' && item.isCustomDish && confirmDelete) {
        return (
            <Card className="overflow-hidden flex flex-col border-destructive ring-2 ring-destructive/20 shadow-md">
                <div className="p-5 flex-1 flex flex-col items-center text-center justify-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-foreground">Delete Dish?</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Are you sure you want to delete <strong className="text-foreground">{item.foodName}</strong>? This action will hide it from menus.
                        </p>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={handleCancelDelete} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : 'Yes, Delete'}
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    // Default View (Normal mode, or custom dish falling back to normal UI, or system dish ignoring edit/delete modes)
    return (
        <Card className={`overflow-hidden group transition-all flex flex-col relative
            ${mode === 'normal' ? 'hover:shadow-md' : 'opacity-80'}
            ${mode === 'delete' && item.isCustomDish ? 'border-destructive/30 hover:border-destructive' : ''}
        `}>
            {/* Image Header */}
            <div className={`relative h-32 w-full bg-muted ${mode === 'normal' ? 'group-hover:opacity-90' : ''}`}>
                <img
                    src={item.imageUrl || '/menu-images/placeholder.jpg'}
                    alt={item.foodName}
                    className={`w-full h-full object-cover transition-transform duration-500
                        ${mode === 'normal' ? 'group-hover:scale-105' : ''}
                    `}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/menu-images/placeholder.jpg';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <Badge variant="secondary" className={`absolute bottom-2 left-2 text-[10px] px-2 py-0.5 backdrop-blur-md bg-white/90 font-bold border-0
                    ${item.vegOrNonVeg === 'veg' ? 'text-green-700' : 'text-red-700'}
                `}>
                    {item.vegOrNonVeg === 'veg' ? 'VEG' : 'NON-VEG'}
                </Badge>
                {!item.isCustomDish && (
                    <Badge variant="default" className="absolute top-2 right-2 text-[10px] bg-blue-600 border-none shadow-sm">
                        SYSTEM
                    </Badge>
                )}
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 flex flex-col justify-between bg-card relative z-10">
                <div>
                    <h3 className="font-bold text-foreground leading-tight">{item.foodName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs font-semibold text-primary">{item.category}</p>
                        {item.isCustomDish && (
                            <span className="text-[10px] text-orange-600 font-medium bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-sm w-fit">
                                Custom
                            </span>
                        )}
                    </div>
                </div>

                {/* Delete Mode Trigger Footer */}
                {mode === 'delete' && item.isCustomDish && !confirmDelete && (
                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full shadow-sm"
                            onClick={handleDeleteClick}
                        >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete Dish
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
