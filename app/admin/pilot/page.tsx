'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const API_URL = 'http://localhost:5003/api';

export default function PilotPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        usersTesterCount: '',
        durationDays: '',
        issuesFound: '',
        improvements: '',
        successRate: '',
        userFeedback: ''
    });

    const fetchReports = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/pilot-reports`, { withCredentials: true });
            setReports(res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line
        fetchReports();
    }, [fetchReports]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/admin/pilot-reports`, formData, { withCredentials: true });
            fetchReports();
            setFormData({
                usersTesterCount: '',
                durationDays: '',
                issuesFound: '',
                improvements: '',
                successRate: '',
                userFeedback: ''
            });
            toast.success('Report Submitted Successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to submit report');
        }
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50/50 dark:bg-zinc-950">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Pilot Testing & Reporting</h2>
                <p className="text-muted-foreground">Track pilot program metrics and user feedback.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>New Pilot Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Testers Count</Label>
                                    <Input
                                        type="number"
                                        value={formData.usersTesterCount}
                                        onChange={(e) => setFormData({ ...formData, usersTesterCount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Days)</Label>
                                    <Input
                                        type="number"
                                        value={formData.durationDays}
                                        onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Success Rate (%)</Label>
                                <Input
                                    type="number"
                                    max="100"
                                    value={formData.successRate}
                                    onChange={(e) => setFormData({ ...formData, successRate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Issues Found</Label>
                                <Textarea
                                    value={formData.issuesFound}
                                    onChange={(e) => setFormData({ ...formData, issuesFound: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Improvements Made</Label>
                                <Textarea
                                    value={formData.improvements}
                                    onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>User Feedback</Label>
                                <Textarea
                                    value={formData.userFeedback}
                                    onChange={(e) => setFormData({ ...formData, userFeedback: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="w-full">Submit Report</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Previous Reports</h2>
                    {reports.map((report) => (
                        <Card key={report._id}>
                            <CardHeader>
                                <CardTitle className="text-lg">Pilot Report - {new Date(report.createdAt).toLocaleDateString()}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Testers: {report.usersTesterCount}</span>
                                    <span>Duration: {report.durationDays} days</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Success Rate:</span>
                                    <span className={report.successRate > 80 ? 'text-green-600' : 'text-yellow-600'}>{report.successRate}%</span>
                                </div>
                                <div>
                                    <span className="font-semibold">Issues:</span> {report.issuesFound}
                                </div>
                                <div>
                                    <span className="font-semibold">Improvements:</span> {report.improvements}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
