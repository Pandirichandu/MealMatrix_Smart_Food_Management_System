

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'alert';
    isRead: boolean;
    createdAt: string;
}

export function NotificationPanel({ role }: { role: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Currently only implemented for student in backend routes provided in plan
                // But structure suggests easy expansion. defaulting to student endpoint for now or check role.
                // Assuming admin might want to see system alerts too, but let's stick to student for this specific request context 
                // about "Student Balance & Funds" and "Notify users". 
                // Admin might have a different endpoint or shared one.
                // Using student endpoint if role is student.

                let endpoint = '';
                if (role === 'student') endpoint = 'http://localhost:5003/api/student/notifications'; // Using full URL to be safe or relative. 
                // Next.js client side usually uses relative /api but invalid for absolute axios if not proxy.
                // Next.js usually runs on 3000, backend on 5003. Need full URL or proxy.
                // Plan didn't specify proxy setup, but previous files used full URL in test scripts.
                // Let's try relative '/api/...' if next.config rewrites are there, else full URL.
                // Checking previous validation_qr.js used localhost:5003. safer to use that.

                // WAIT: Browser runs on 3000. It cannot hit localhost:5003 directly comfortably with cookies unless CORS is set up.
                // Assuming CORS is set up or Proxy.
                // Let's use relative path expecting Next.js re-writes or CORS.
                // Edit: To be safe, I'll use a hardcoded base URL for now as per common dev setups.

                const API_URL = 'http://localhost:5003/api';

                if (role === 'student') {
                    const res = await axios.get(`${API_URL}/student/notifications`, { withCredentials: true });
                    setNotifications(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [role]);

    if (role !== 'student' && notifications.length === 0) return null; // Hide if empty and not student (or enhance later)

    return (
        <Card className="w-full h-fit max-h-[400px] overflow-auto">
            <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" /> Notifications
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {notifications.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No new notifications.</p>
                ) : (
                    notifications.map((notif) => (
                        <div key={notif._id} className={`p-3 rounded-md border ${notif.isRead ? 'bg-background' : 'bg-muted/50'} border-l-4 ${notif.type === 'warning' ? 'border-l-yellow-500' :
                            notif.type === 'success' ? 'border-l-green-500' : 'border-l-blue-500'
                            }`}>
                            <h4 className="font-semibold text-sm">{notif.title}</h4>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                            <p className="text-[10px] text-right mt-1 text-muted-foreground">{new Date(notif.createdAt).toLocaleDateString()}</p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
