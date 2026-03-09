"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Search, Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import axios from "axios"
import { API_URL } from "@/lib/config"
import { DishCard, FoodItem } from "@/components/owner/dish-card"

const CATEGORIES = ["All", "Main", "Breads", "Rice", "Beverages", "Dessert", "Snacks"]

export default function ManageDishesPage() {
    const [catalog, setCatalog] = useState<FoodItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('All')

    const fetchDishes = async () => {
        setLoading(true)
        setError(false)
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.append('search', searchQuery)
            if (filterCategory !== 'All') params.append('category', filterCategory)

            // Using existing endpoint, max limit to get full owner catalog
            params.append('limit', '100')

            const res = await axios.get(`${API_URL}/api/owner/dishes?${params.toString()}`, {
                withCredentials: true
            })
            setCatalog(res.data.dishes || [])
        } catch (err) {
            console.error("Fetch dishes error:", err)
            setError(true)
            toast.error("Failed to load global catalog")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchDishes()
        }, 300)
        return () => clearTimeout(timeout)
    }, [searchQuery, filterCategory])

    const handleUpdate = (updatedDish: FoodItem) => {
        setCatalog(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
    }

    const handleDelete = (dishId: string) => {
        setCatalog(prev => prev.filter(d => d._id !== dishId));
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground" onClick={() => window.location.href = '/owner/menu'}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Menu
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Manage Dishes</h1>
                    <p className="text-muted-foreground mt-1">Globally update dish details or permanently delete them from your catalog.</p>
                </div>
            </div>

            {/* Filters Area */}
            <div className="space-y-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search your custom dishes..."
                        className="pl-9 bg-gray-50 dark:bg-zinc-800 border-0"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                                ${filterCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:border-gray-400'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className="text-muted-foreground">Could not load the catalog.</p>
                </div>
            ) : catalog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-zinc-900/50">
                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-full mb-4 shadow-sm">
                        <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-foreground">No dishes found</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        You haven't added any custom dishes yet, or no dishes match your search criteria.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {catalog.map(item => (
                        <DishCard
                            key={item._id}
                            item={item}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
