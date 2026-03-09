"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"

interface AttendanceRecord {
    date: string
    mealType: string
    status: 'PRESENT' | 'ABSENT' | 'NOT_BOOKED'
    details?: any[]
}

interface AttendanceStats {
    totalEligible: number
    totalPresent: number
    totalMissed: number
    percentage: number
}

export function AttendanceHistory({ studentId }: { studentId: string }) {
    const [history, setHistory] = useState<AttendanceRecord[]>([])
    const [stats, setStats] = useState<AttendanceStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!studentId) return
            try {
                const res = await axios.get(`${API_URL}/api/owner/student/${studentId}/attendance`, {
                    withCredentials: true
                })
                setHistory(res.data.history)
                setStats(res.data.stats)
            } catch (error) {
                console.error("Failed to fetch attendance history", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAttendance()
    }, [studentId])

    if (loading) return <div className="text-center py-4 text-sm text-muted-foreground">Loading attendance history...</div>

    if (!stats) return <div className="text-center py-4 text-sm text-muted-foreground">No attendance data available.</div>

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.percentage < 75 ? 'text-red-500' : 'text-green-600'}`}>
                            {stats.percentage}%
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Eligible Meals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEligible}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Attended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.totalPresent}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Missed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{stats.totalMissed}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" /> Recent History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Meal</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                            No recent records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.slice(0, 10).map((record, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{record.date}</TableCell>
                                            <TableCell className="capitalize">{record.mealType}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        record.status === 'PRESENT' ? 'default' :
                                                            record.status === 'ABSENT' ? 'destructive' : 'secondary'
                                                    }
                                                    className={
                                                        record.status === 'PRESENT' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' :
                                                            record.status === 'ABSENT' ? 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' : ''
                                                    }
                                                >
                                                    {record.status === 'PRESENT' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                    {record.status === 'ABSENT' && <XCircle className="w-3 h-3 mr-1" />}
                                                    {record.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
