"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import axios from "axios"
import { API_URL } from "@/lib/config"
import { User as UserIcon } from "lucide-react"

export function ProfileForm() {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true })
            setName(res.data.name)
        } catch (error) {
            console.error(error)
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await axios.put(`${API_URL}/api/auth/update-profile`, {
                name
            }, { withCredentials: true })

            toast.success("Profile updated successfully")
            // Optional: Trigger a global user refresh via context if implemented
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Failed to update profile")
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return <div className="p-4 text-sm text-muted-foreground">Loading profile...</div>

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Profile Details
                </CardTitle>
                <CardDescription>
                    Update your public display name.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
