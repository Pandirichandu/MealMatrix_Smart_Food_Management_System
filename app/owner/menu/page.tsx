"use client"

/*
 * ======================================================================================
 * PERMANENT REGRESSION GUARD: QUANTITY ISOLATION RULES
 * ======================================================================================
 * Context: Owner Menu Planner (Edit Mode)
 * Critical Requirement: Each selected dish MUST maintain independent quantity state.
 * 
 * NON-NEGOTIABLE RULES:
 * 1. Every UI item must have a `uiId` (frontend-only unique string).
 *    - Generated on `fetchExistingMenu` and `toggleDishSelection`.
 * 2. React list `key` prop MUST use `item.uiId`.
 *    - NEVER use array index.
 *    - NEVER use backend `_id` (duplicates exist in menu editing).
 * 3. Quantity updates (`updateMaxQuantity`) MUST target `uiId` strictly.
 * 4. State updates MUST be immutable (map by `uiId`).
 * 5. `uiId` MUST be stripped before API save (`handlePublishMenu`).
 * 6. Shared object references are FORBIDDEN. Always clone items on load.
 * 
 * FAILURE TO FOLLOW THESE RULES WILL CAUSE "UPDATE ALL" BUGS.
 * ======================================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Search, Check, Calendar as CalendarIcon, RefreshCw, AlertCircle, Loader2, Sun, Moon, Utensils, Pencil, X, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import axios from "axios"
import { DishCard, FoodItem } from '@/components/owner/dish-card'
import { API_URL } from "@/lib/config"

// DnD Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Interface moved to DishCard, using it from there but keeping localized extensions if needed:
// maxQuantity, uiId exist in the imported FoodItem interface.

const CATEGORIES = ["All", "Main", "Breads", "Rice", "Beverages", "Dessert", "Snacks"]
const LIMIT = 20

// Sortable Row Component for Dnd Kit
function SortableDishItem({
    item,
    handleRemoveRequest,
    updateMaxQuantity
}: {
    item: FoodItem,
    handleRemoveRequest: (dish: FoodItem) => void,
    updateMaxQuantity: (id: string, delta: number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.uiId as string });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-destructive/5 hover:border-destructive/20 transition-all relative shadow-sm
                ${isDragging ? 'opacity-50 border-primary ring-2 ring-primary shadow-xl scale-[1.02] bg-primary/5' : ''}
            `}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground transition-colors p-1">
                        <GripVertical className="w-5 h-5" />
                    </div>
                    <img src={item.imageUrl} alt={item.foodName} className="w-12 h-12 rounded-lg object-cover bg-muted ring-1 ring-border" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{item.foodName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.vegOrNonVeg === 'veg' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {item.vegOrNonVeg}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto leading-none border-primary/20 bg-primary/5 text-primary">
                                {item.category}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRequest(item);
                        }}
                    >
                        <X className="w-3.5 h-3.5 sm:mr-1" /> <span className="hidden sm:inline">Remove</span>
                    </Button>
                </div>
            </div>

            {/* Quantity Controller */}
            <div className="text-xs flex items-center justify-between border-t border-border/50 pt-2 mt-1 px-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    Limit <span className="text-[10px] opacity-70">(per student)</span>
                </span>
                <div className="flex items-center gap-2 bg-secondary/10 rounded-md p-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-sm hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.uiId) updateMaxQuantity(item.uiId, -1);
                        }}
                    >
                        <span className="mb-0.5">-</span>
                    </Button>
                    <span className="w-4 text-center font-bold text-foreground">{item.maxQuantity || 1}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-sm hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.uiId) updateMaxQuantity(item.uiId, 1);
                        }}
                    >
                        <span className="mb-0.5">+</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function MenuPage() {
    // Selection State
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast')
    // CHANGED: Store full objects to persist selection across searches/filters
    const [selectedDishes, setSelectedDishes] = useState<FoodItem[]>([])
    const [maxDishesPerStudent, setMaxDishesPerStudent] = useState<string>('') // Empty string = no limit

    // Catalog & Filter State
    const [catalog, setCatalog] = useState<FoodItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(false)

    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('All')
    const [filterVegType, setFilterVegType] = useState<'all' | 'veg' | 'non-veg'>('all')

    const [customForm, setCustomForm] = useState({
        foodName: '',
        category: 'Main',
        vegOrNonVeg: 'veg' as 'veg' | 'non-veg',
        price: '0',
        image: null as File | null
    })
    const [uploading, setUploading] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    // Global Mode State
    const [globalMode, setGlobalMode] = useState<'normal' | 'edit' | 'delete'>('normal')

    // Server-Side Search Effect
    useEffect(() => {
        // Initial Cache Check
        const cached = sessionStorage.getItem('dishCache')
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached)
                if (Date.now() - timestamp < 60000) { // 1 min frontend cache
                    setCatalog(data)
                    setLoading(false)
                    setPage(2)
                }
            } catch (e) {
                sessionStorage.removeItem('dishCache')
            }
        }

        const delayDebounceFn = setTimeout(() => {
            fetchDishes(true)
        }, 300)


        return () => clearTimeout(delayDebounceFn)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, filterCategory, filterVegType])

    const fetchDishes = async (reset = false) => {
        if (reset) {
            setLoading(true)
            setError(false)
            setHasMore(true)
        } else {
            setLoadingMore(true)
        }

        try {
            // Cookie based auth - no local check needed

            const params = new URLSearchParams()
            if (searchQuery) params.append('search', searchQuery)
            if (filterCategory !== 'All') params.append('category', filterCategory)
            if (filterVegType !== 'all') params.append('vegType', filterVegType)

            const currentPage = reset ? 1 : page
            params.append('page', currentPage.toString())
            params.append('limit', LIMIT.toString())

            const res = await axios.get(`${API_URL}/api/owner/dishes?${params.toString()}`, {
                withCredentials: true
            })

            const newItems: FoodItem[] = res.data.dishes || []

            if (reset) {
                setCatalog(newItems)
                setPage(2)
            } else {
                setCatalog(prev => {
                    const existingIds = new Set(prev.map(i => i._id))
                    const uniqueNew = newItems.filter(i => !existingIds.has(i._id))
                    return [...prev, ...uniqueNew]
                })
                setPage(prev => prev + 1)
            }

            if (newItems.length < LIMIT) {
                setHasMore(false)
            } else {
                setHasMore(true)
            }
            setError(false)
            setRetryCount(0)

            // Cache update only for default view
            if (reset && !searchQuery && filterCategory === 'All' && filterVegType === 'all') {
                sessionStorage.setItem('dishCache', JSON.stringify({
                    data: newItems,
                    timestamp: Date.now()
                }))
            }

        } catch (error: any) {
            console.error("Fetch dishes error:", error)

            if (error.response?.status === 401) {
                toast.error("Session expired")
                localStorage.removeItem('token')
                window.location.href = '/login'
                return
            }

            // AUTO RETRY LOGIC (1 attempt) - Skip for 4xx errors
            if (retryCount < 1 && (!error.response || error.response.status >= 500)) {
                console.log('Retrying fetch...')
                setRetryCount(prev => prev + 1)
                setTimeout(() => fetchDishes(reset), 1000)
                return;
            }

            setError(true)
            toast.error("Failed to load dishes")
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    // Logic for showing custom form:
    // If search is active (length > 0) AND server returns empty list -> Show Form
    const showCustomForm = !loading && catalog.length === 0 && searchQuery.length > 0 && !error;

    // CHANGED: Accepts full object now
    const toggleDishSelection = (dish: FoodItem) => {
        setSelectedDishes(prev => {
            const exists = prev.find(d => d._id === dish._id)
            if (exists) {
                return prev.filter(d => d._id !== dish._id)
            } else {
                // Initialize with maxQuantity = 1 & Unique UI ID
                // Inline generator for safety
                const newUiId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                return [...prev, { ...dish, uiId: newUiId, maxQuantity: 1 }]
            }
        })
    }

    // New Remove Confirmation & Undo State
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
    const [dishToRemove, setDishToRemove] = useState<FoodItem | null>(null)
    const [undoBackup, setUndoBackup] = useState<{ item: FoodItem, index: number } | null>(null)
    const revertTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleRemoveRequest = (dish: FoodItem) => {
        setDishToRemove(dish)
        setIsRemoveModalOpen(true)
    }

    const confirmRemove = () => {
        if (!dishToRemove) return

        // 1. Find original index for undo
        const targetIndex = selectedDishes.findIndex(d => d.uiId === dishToRemove.uiId)
        if (targetIndex !== -1) {
            setUndoBackup({ item: dishToRemove, index: targetIndex })
        }

        // 2. Remove from state
        setSelectedDishes(prev => prev.filter(d => d.uiId !== dishToRemove.uiId))
        setIsRemoveModalOpen(false)
        setDishToRemove(null)

        // 3. Setup toast with Undo action
        toast.dismiss('undo-toast')
        toast("Dish Removed", {
            id: 'undo-toast',
            description: `${dishToRemove.foodName} removed from menu draft.`,
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    handleUndoRemove()
                },
            },
        })

        // 4. Clear backup after 5s
        if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current)
        revertTimeoutRef.current = setTimeout(() => {
            setUndoBackup(null)
        }, 5000)
    }

    const handleUndoRemove = () => {
        if (!undoBackup) return

        setSelectedDishes(prev => {
            const newArray = [...prev]
            // Reinsert at exact old position, or push if out of bounds
            if (undoBackup.index >= 0 && undoBackup.index <= newArray.length) {
                newArray.splice(undoBackup.index, 0, undoBackup.item)
            } else {
                newArray.push(undoBackup.item)
            }
            return newArray
        })

        toast.success("Dish Restored")
        setUndoBackup(null)
        if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current)
    }

    const updateMaxQuantity = (id: string, delta: number) => {
        setSelectedDishes(prev => prev.map(item => {
            if (item.uiId === id) {
                const current = item.maxQuantity || 1;
                const next = Math.max(1, current + delta); // Min 1
                return { ...item, maxQuantity: next };
            }
            return item;
        }));
    };

    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customForm.image) {
            toast.error("Image is mandatory for custom dishes")
            return
        }
        if (!customForm.foodName.trim()) {
            toast.error("Dish name is required")
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('foodName', customForm.foodName)
            formData.append('category', customForm.category)
            formData.append('vegOrNonVeg', customForm.vegOrNonVeg)
            formData.append('price', customForm.price)
            formData.append('image', customForm.image)

            const res = await axios.post(`${API_URL}/api/owner/add-custom-dish`, formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            toast.success("Dish Created!")

            const newDish = res.data
            // Add to catalog 
            setCatalog(prev => [newDish, ...prev])
            // Select automatically with default maxQuantity
            setSelectedDishes(prev => [...prev, { ...newDish, maxQuantity: 1 }])

            // Reset
            setCustomForm({
                foodName: '',
                category: 'Main',
                vegOrNonVeg: 'veg',
                price: '0',
                image: null
            })
            // setSearchQuery('') // CHANGED: Prevent re-fetch to maintain smooth state

        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.msg || "Failed to create dish")
        } finally {
            setUploading(false)
        }
    }

    // Editable Menu State
    const [isEditing, setIsEditing] = useState(false)
    const [menuLoading, setMenuLoading] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    // CHANGED: Added `silent` parameter to suppress toast on re-fetch
    const fetchExistingMenu = useCallback(async (silent = false) => {
        if (!selectedDate || !selectedMealType) return

        setMenuLoading(true)
        try {
            const res = await axios.get(`${API_URL}/api/owner/menu`, {
                params: { date: selectedDate, mealType: selectedMealType },
                withCredentials: true
            })

            const menu = res.data
            // Combine items
            const existingItems: FoodItem[] = [
                ...(menu.vegItems || []),
                ...(menu.nonVegItems || [])
            ]

            // Transform to FoodItem format (ensure _id matches catalog)
            // Note: Menu items might have generated _ids if not linked properly. 
            // Ideally we need the original FoodItem _id. 
            // In our Schema, MenuItemSchema is embedded but likely contains the same fields.
            // If _id validation fails, we might need to rely on foodName or check if _id is preserved.
            // Assuming _id is preserved or we can use item properties.

            // Re-map to ensure maxQuantity is present AND IDs are unique
            const seenIds = new Set();

            // Helper for robust ID generation
            const generateUiId = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    return crypto.randomUUID();
                }
                return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            const mappedItems = existingItems.map((item: any, index: number) => {
                // Generate robust ID: Use existing if valid & unique, else generated
                let finalId = item._id;
                if (!finalId || seenIds.has(finalId)) {
                    finalId = `temp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
                }
                seenIds.add(finalId);

                return {
                    _id: finalId,
                    uiId: generateUiId(), // FIXED: Assign unique frontend ID
                    foodName: item.foodName,
                    imageUrl: item.imageUrl,
                    category: item.category,
                    vegOrNonVeg: item.vegOrNonVeg,
                    price: item.price,
                    isCustomDish: item.isCustomDish,
                    maxQuantity: item.maxQuantity || 1
                };
            })

            setSelectedDishes(mappedItems)
            setIsEditing(true)
            if (menu.updatedAt) setLastUpdated(menu.updatedAt)
            // Load configured limit or reset
            setMaxDishesPerStudent(menu.maxDishesPerStudent ? String(menu.maxDishesPerStudent) : '')
            // CHANGED: Only show toast if NOT silent
            if (!silent) {
                toast.info(`Loaded existing ${selectedMealType} menu for editing`)
            }

        } catch (error: any) {
            // 404 is expected for new menus
            if (error.response?.status === 404) {
                setSelectedDishes([])
                setIsEditing(false)
            } else {
                console.error("Error fetching existing menu:", error)
            }
        } finally {
            setMenuLoading(false)
        }
    }, [selectedDate, selectedMealType])

    // Check for existing menu when Date or MealType changes
    useEffect(() => {
        if (selectedDate && selectedMealType) {
            fetchExistingMenu()
        } else {
            // Reset if selection invalid/cleared
            setSelectedDishes([])
            setMaxDishesPerStudent('')
            setIsEditing(false)
        }
    }, [selectedDate, selectedMealType, fetchExistingMenu])

    const handlePublishMenu = async (status: 'DRAFT' | 'PUBLISHED') => {
        if (!selectedDate) {
            toast.error("Please select a date")
            return
        }
        if (selectedDishes.length === 0) {
            toast.error("Please select at least one dish")
            return
        }

        try {
            // CHANGED: Use selectedDishes directly
            const selectedItems = selectedDishes

            // CHANGED: Strip _id AND uiId to ensure Mongoose generates fresh valid ObjectIds
            // This prevents "CastError" if we sent 'temp-...' IDs and avoids duplicate key errors
            const cleanItem = ({ _id, uiId, ...rest }: any) => rest;

            // Split into Veg and Non-Veg for new Schema
            const vegItems = selectedItems.filter(i => i.vegOrNonVeg === 'veg').map(cleanItem)
            const nonVegItems = selectedItems.filter(i => i.vegOrNonVeg === 'non-veg').map(cleanItem)

            const payload = {
                date: selectedDate,
                mealType: selectedMealType,
                vegItems,
                nonVegItems,
                status,
                maxDishesPerStudent: maxDishesPerStudent ? parseInt(maxDishesPerStudent) : null
            }

            await axios.post(`${API_URL}/api/owner/save-menu`, payload, {
                withCredentials: true
            })

            const action = status === 'DRAFT' ? 'saved as Draft' : 'published';
            toast.success(`Menu ${action} for ${selectedMealType}!`)

            // RESET LOGIC
            // Don't clear date/mealType, just refresh the data (which will start "editing" the just-saved menu)
            fetchExistingMenu(true) // CHANGED: Silent reload

            setSearchQuery('')
            setFilterCategory('All')
            setFilterVegType('all')

        } catch (error: any) {
            console.error(error)
            const errorMsg = error.response?.data?.msg || "Failed to update menu"
            toast.error(errorMsg)
        }
    }

    // Drag and Drop Logic
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires minimum 5px movement before starting drag, avoids accidental clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSelectedDishes((items) => {
                const oldIndex = items.findIndex((item) => item.uiId === active.id);
                const newIndex = items.findIndex((item) => item.uiId === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Menu Planner</h1>
                    <p className="text-muted-foreground">Curate your daily menu for students.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {isEditing && (
                        <div className="flex flex-col items-end mr-2">
                            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 mb-1">
                                Editing Mode
                            </Badge>
                            {lastUpdated && (
                                <span className="text-[10px] text-muted-foreground">
                                    Last Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handlePublishMenu('DRAFT')}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        Save Draft
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => handlePublishMenu('PUBLISHED')}
                        className={`shadow-lg uppercase font-bold tracking-wide text-white transition-all
                            ${isEditing
                                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                            }`}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        {isEditing ? 'Update & Publish' : 'Publish Menu'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT PANEL: Controls */}
                <Card className="lg:col-span-4 sticky top-6 border-0 shadow-md bg-white/80 backdrop-blur-sm self-start">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle className="text-xl">Configuration</CardTitle>
                        <CardDescription>Select target date and meal type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    min={new Date().toLocaleDateString('en-CA')} // YYYY-MM-DD in local time
                                    value={selectedDate}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const today = new Date().toLocaleDateString('en-CA');
                                        if (val && val < today) {
                                            toast.error("Past dates are not allowed");
                                            return;
                                        }
                                        setSelectedDate(val);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Meal Type</Label>
                            <Tabs value={selectedMealType} onValueChange={(v: any) => setSelectedMealType(v)} className="w-full">
                                <TabsList className="grid grid-cols-3 w-full">
                                    <TabsTrigger value="breakfast" className="gap-2">
                                        <Sun className="w-4 h-4" /> Breakfast
                                    </TabsTrigger>
                                    <TabsTrigger value="lunch" className="gap-2">
                                        <Utensils className="w-4 h-4" /> Lunch
                                    </TabsTrigger>
                                    <TabsTrigger value="dinner" className="gap-2">
                                        <Moon className="w-4 h-4" /> Dinner
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Max Dish Types Control */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center">
                                <Label>Max Dish Types Allowed</Label>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${maxDishesPerStudent ? "text-primary" : "text-muted-foreground"}`}>
                                    {maxDishesPerStudent ? "Limit Set" : "Unlimited"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const current = parseInt(maxDishesPerStudent || '0');
                                            if (current > 1) setMaxDishesPerStudent(String(current - 1));
                                            else setMaxDishesPerStudent('');
                                        }}
                                        className="h-10 w-10 text-lg hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-l-lg"
                                        disabled={!maxDishesPerStudent}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <div className="w-12 text-center font-bold text-lg tabular-nums border-x border-gray-100 dark:border-zinc-800 h-6 flex items-center justify-center">
                                        {maxDishesPerStudent || '∞'}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const current = parseInt(maxDishesPerStudent || '0');
                                            // Start at 1 if empty
                                            const next = current === 0 ? 1 : current + 1;
                                            setMaxDishesPerStudent(String(next));
                                        }}
                                        className="h-10 w-10 text-lg hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-r-lg bg-primary/5 text-primary"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground leading-tight flex-1">
                                    {maxDishesPerStudent
                                        ? `Students restricted to ${maxDishesPerStudent} unique dishes.`
                                        : "Students can select any number of varied dishes."}
                                </p>
                            </div>
                        </div>

                        {/* SELECTED DISHES LIST */}
                        <div className="pt-4 border-t space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>Selected Dishes:</span>
                                {/* CHANGED: length instead of size */}
                                <Badge variant="secondary" className="text-lg px-3 bg-primary/10 text-primary hover:bg-primary/20">{selectedDishes.length}</Badge>
                            </div>

                            {selectedDishes.length > 0 ? (
                                // CHANGED: max-h-[250px] as requested
                                <div className="max-h-[250px] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={selectedDishes.map((d) => d.uiId as string)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-2">
                                                {selectedDishes.map(item => (
                                                    <SortableDishItem
                                                        key={item.uiId}
                                                        item={item}
                                                        handleRemoveRequest={handleRemoveRequest}
                                                        updateMaxQuantity={updateMaxQuantity}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-zinc-900/50">
                                    <div className="p-3 bg-white dark:bg-zinc-800 rounded-full mb-3 shadow-sm">
                                        <Plus className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">No dishes selected</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">Select items from the list to add them.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT PANEL: Dish Grid or Add Form */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Search & Categories & Mode Slider */}
                    <div className="space-y-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search existing dishes..."
                                    className="pl-9 bg-gray-50 border-0"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Mode Control Slider */}
                            <div className="flex bg-gray-100/80 dark:bg-zinc-800/80 p-1 rounded-lg w-full md:w-auto overflow-hidden shrink-0 shadow-inner">
                                <button
                                    onClick={() => {
                                        console.log("Setting Mode to Normal");
                                        setGlobalMode('normal');
                                    }}
                                    className={`flex-1 md:w-24 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                                        ${globalMode === 'normal' ? 'bg-white dark:bg-zinc-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/80'}
                                    `}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => {
                                        console.log("Setting Mode to Edit");
                                        setGlobalMode('edit');
                                    }}
                                    className={`flex-1 md:w-24 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                                        ${globalMode === 'edit' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:text-foreground/80'}
                                    `}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        console.log("Setting Mode to Delete");
                                        setGlobalMode('delete');
                                    }}
                                    className={`flex-1 md:w-24 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                                        ${globalMode === 'delete' ? 'bg-destructive shadow-sm text-destructive-foreground' : 'text-muted-foreground hover:text-foreground/80'}
                                    `}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCategory(cat)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                                        ${filterCategory === cat
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    {loading && catalog.length === 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                            <p className="text-muted-foreground mb-4">Network issue. Could not load dishes.</p>
                            <Button variant="outline" onClick={() => { setRetryCount(0); fetchDishes(true); }}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Retry Now
                            </Button>
                        </div>
                    ) : showCustomForm ? (
                        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle>Add New Custom Dish</CardTitle>
                                <CardDescription>No results found for "{searchQuery}". Create a new dish.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCustomSubmit} className="space-y-4 max-w-lg">
                                    <div className="space-y-2">
                                        <Label>Dish Name</Label>
                                        <Input
                                            value={customForm.foodName || searchQuery}
                                            onChange={e => {
                                                setCustomForm({ ...customForm, foodName: e.target.value })
                                                if (searchQuery && e.target.value !== searchQuery) setSearchQuery(e.target.value)
                                            }}
                                            placeholder="e.g. Special Egg Dosa"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Category</Label>
                                            <Select value={customForm.category} onValueChange={v => setCustomForm({ ...customForm, category: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORIES.filter(c => c !== 'All').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div className="flex gap-4 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="veg" checked={customForm.vegOrNonVeg === 'veg'} onChange={() => setCustomForm({ ...customForm, vegOrNonVeg: 'veg' })} />
                                                    <span className="text-green-600 font-bold text-sm">Veg</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="veg" checked={customForm.vegOrNonVeg === 'non-veg'} onChange={() => setCustomForm({ ...customForm, vegOrNonVeg: 'non-veg' })} />
                                                    <span className="text-red-600 font-bold text-sm">Non-Veg</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Image (Mandatory)</Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setCustomForm({ ...customForm, image: e.target.files?.[0] || null })}
                                        />
                                        <p className="text-xs text-muted-foreground">Required for custom dishes.</p>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setSearchQuery('')}>Cancel</Button>
                                        <Button type="submit" disabled={uploading}>
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : 'Create & Select'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : catalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
                            <span className="text-4xl mb-4">🍽️</span>
                            <h3 className="text-lg font-medium">No dishes found</h3>
                            <p className="text-muted-foreground mb-6">There are no dishes matching your current filters.</p>
                            <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterCategory('All'); setFilterVegType('all'); }}>
                                Clear Filters
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {catalog.map(item => {
                                    // Check if selected
                                    const selectedItem = selectedDishes.find(d => d._id === item._id)
                                    const isSelected = !!selectedItem
                                    const qty = selectedItem?.maxQuantity || 0

                                    console.log(`[page.tsx Render] Dish: ${item.foodName} | isCustomDish: ${item.isCustomDish} | globalMode: ${globalMode}`);

                                    return (
                                        <div
                                            key={`${item._id}-${globalMode}`} // Changes key on mode swap to guarantee state reset
                                            className="relative"
                                        >
                                            {/* DishCard Handle Rendering Data and Edit/Delete Modes internally */}
                                            <DishCard
                                                item={item}
                                                mode={globalMode}
                                                onUpdate={(updatedDish) => {
                                                    // Update Catalog
                                                    setCatalog(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
                                                    // Also update any selected instance
                                                    setSelectedDishes(prev => prev.map(d => d._id === updatedDish._id ? { ...updatedDish, uiId: d.uiId, maxQuantity: d.maxQuantity } : d));
                                                }}
                                                onDelete={(dishId) => {
                                                    // Remove from Catalog
                                                    setCatalog(prev => prev.filter(d => d._id !== dishId));
                                                    // Remove from selection if it was there
                                                    setSelectedDishes(prev => prev.filter(d => d._id !== dishId));
                                                }}
                                            />

                                            {/* OVERLAY: Menu Addition Logistics (ONLY ACTIVE IN NORMAL MODE) */}
                                            {globalMode === 'normal' && (
                                                <div
                                                    className="absolute inset-0 z-20 cursor-pointer rounded-2xl overflow-hidden"
                                                    onClick={() => !isSelected && toggleDishSelection(item)}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full border-2 bg-primary border-primary text-white flex items-center justify-center transition-all duration-300 z-30 shadow-sm">
                                                            <Check className="w-3.5 h-3.5 stroke-[4]" />
                                                        </div>
                                                    )}

                                                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-200
                                                        ${isSelected ? 'bg-black/40 backdrop-blur-[2px] opacity-100' : 'bg-transparent opacity-0 hover:opacity-100 hover:bg-black/10'}
                                                    `}>
                                                        {isSelected && (
                                                            <div
                                                                className="flex items-center gap-3 bg-white dark:bg-zinc-800 p-2 rounded-full shadow-2xl animate-in fade-in zoom-in-50 duration-200 transform scale-110"
                                                                onClick={(e) => e.stopPropagation()} // Prevent card deselect
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-800 dark:text-gray-200 font-bold"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (qty <= 1) {
                                                                            toggleDishSelection(item); // Remove if going to 0
                                                                        } else {
                                                                            if (selectedItem?.uiId) updateMaxQuantity(selectedItem.uiId, -1);
                                                                        }
                                                                    }}
                                                                >
                                                                    <span className="text-xl font-bold leading-none mb-1">-</span>
                                                                </Button>

                                                                <div className="flex flex-col items-center min-w-[2.5rem]">
                                                                    <span className="text-xl font-extrabold tabular-nums text-primary leading-none shadow-sm">{qty}</span>
                                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">LIMIT</span>
                                                                </div>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-600 text-gray-800 dark:text-gray-200 font-bold"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (selectedItem?.uiId) updateMaxQuantity(selectedItem.uiId, 1);
                                                                    }}
                                                                >
                                                                    <span className="text-xl font-bold leading-none mb-1">+</span>
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* LOAD MORE BUTTON */}
                            {hasMore && catalog.length > 0 && (
                                <div className="flex justify-center pt-8">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => fetchDishes(false)}
                                        disabled={loadingMore}
                                        className="w-full md:w-auto px-8 py-6 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                                    >
                                        {loadingMore ? 'Loading More Dishes...' : 'Load More Dishes'}
                                    </Button>
                                </div>
                            )}

                            {!hasMore && catalog.length > 0 && (
                                <div className="text-center py-8 opacity-50">
                                    <p className="text-sm">You have reached the end of the menu.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Remove Confirmation Modal */}
            <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Remove Dish?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong className="text-foreground">{dishToRemove?.foodName}</strong> from the current menu draft?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsRemoveModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRemove}>Confirm Remove</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
