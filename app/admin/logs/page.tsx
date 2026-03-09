"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert, Download, Search, ChevronLeft, ChevronRight, FilterX } from "lucide-react";
import { API_URL } from "@/lib/config";
import axios from "axios";
import { toast } from "sonner";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (search) params.search = search;
            if (actionFilter && actionFilter !== "ALL") params.action = actionFilter;
            if (roleFilter && roleFilter !== "ALL") params.role = roleFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await axios.get(`${API_URL}/api/admin/audit-logs`, {
                params,
                withCredentials: true
            });
            setLogs(res.data.logs);
            setTotalPages(res.data.totalPages);
            setTotalLogs(res.data.totalLogs);
        } catch (error) {
            console.error("Failed to fetch logs", error);
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }, [page, search, actionFilter, roleFilter, startDate, endDate]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchLogs();
        }, 300); // Debounce search
        return () => clearTimeout(timeout);
    }, [fetchLogs]);

    const handleExport = async () => {
        try {
            // Trigger download via window.open or hidden link
            // We use standard fetch/blob approach or just direct link if auth cookie handles it
            // Since API is protected by Cookie, direct link <a href="..."> works if browser sends cookies.
            // Let's use window.open for simplicity, or generate a blob.
            window.open(`${API_URL}/api/admin/audit-logs/export`, '_blank');
            toast.success("Export started");
        } catch (error) {
            toast.error("Export failed");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setActionFilter("ALL");
        setRoleFilter("ALL");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const formatDetails = (details: any) => {
        if (!details) return <span className="text-muted-foreground">-</span>;

        // If it's a simple object, format nicely
        return (
            <div className="text-xs font-mono space-y-1">
                {Object.entries(details).map(([key, value]) => (
                    <div key={key}>
                        <span className="text-muted-foreground">{key}:</span> <span className="text-foreground">{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Audit Logs</h2>
                    <p className="text-muted-foreground">Track system activity, security events, and user actions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-blue-500" />
                        System Activity
                    </CardTitle>
                    <CardDescription>
                        Total Logs: {totalLogs} | Page {page} of {totalPages}
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    {/* Filters Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Action Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                                <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                                <SelectItem value="CREATE_USER">Create User</SelectItem>
                                <SelectItem value="UPDATE_MENU">Update Menu</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            className="w-[160px]"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        />
                        <Input
                            type="date"
                            className="w-[160px]"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        />
                        <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                            <FilterX className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Timestamp</TableHead>
                                    <TableHead className="w-[200px]">Performed By</TableHead>
                                    <TableHead className="w-[150px]">Action</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="w-[120px]">IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No logs found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log._id}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.performedBy?.name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.performedBy?.email}</span>
                                                    <Badge variant="secondary" className="w-fit text-[10px] mt-1 h-5 px-1.5">
                                                        {log.performedBy?.role || 'N/A'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {formatDetails(log.details)}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {log.ipAddress || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
