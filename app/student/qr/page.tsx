"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, RefreshCw } from "lucide-react"
import { API_URL } from "@/lib/config"

export default function StudentQrPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [qrPayload, setQrPayload] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    // Fetch User Data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
                setUserData(res.data.user || res.data); // Handle potential response structure variations

                try {
                    const qrRes = await axios.get(`${API_URL}/api/student/qr`, { withCredentials: true });
                    if (qrRes.data && qrRes.data.qrData) {
                        setQrPayload(qrRes.data.qrData);
                    }
                } catch (qrErr) {
                    console.error("Failed to fetch secure QR:", qrErr);
                    // Legacy fallback or just gracefully fail
                }

                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setError("Unable to generate QR. Please login again.");
                setLoading(false);
            }
        };

        fetchUser();

        // Auto-update date check every minute
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    // Standardize to YYYY-MM-DD to match Backend & Dashboard consistency
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Readable Date for Display: Sun Feb 01 2026
    const displayDate = currentDate.toDateString();

    // qrPayload is fetched from backend and set in state.
    // Ensure we don't render an empty string to the qr code image needlessly.
    const finalQrData = qrPayload || "placeholder";

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="text-red-500 font-semibold">{error}</div>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-8 animate-in fade-in duration-500">
            <div className="text-center mb-8 space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Your Digital Pass</h2>
                <p className="text-muted-foreground mx-auto max-w-md">
                    Show this QR code at the mess counter to verify your meal eligibility.
                </p>
            </div>

            <Card className="w-full max-w-[340px] overflow-hidden shadow-2xl border-0 ring-1 ring-slate-200 bg-white rounded-[2rem] relative group transform transition-all duration-500 hover:scale-[1.02]">
                {/* ID Card Hole Punch Visual */}
                {/* ID Card Hole Punch Visual */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full z-20" />

                {/* Decorative header - Gradient restored but shorter to keep text on white */}
                <div className="absolute top-0 inset-x-0 h-32 bg-primary/90">
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                </div>

                <CardHeader className="relative pt-12 pb-2 text-center flex flex-col items-center z-10">
                    <div className="mb-4 relative">
                        {/* User Avatar / Icon */}
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white text-primary overflow-hidden relative z-10">
                            {userData?.name ? (
                                <span className="text-3xl font-bold z-10 relative">
                                    {userData.name.charAt(0)}
                                </span>
                            ) : (
                                <QrCode className="h-10 w-10 z-10 relative" />
                            )}
                        </div>
                        {/* Status Dot */}
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full z-20 shadow-sm" title="Active Student" />
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col items-center p-6 pt-12 relative z-10 -mt-6 bg-white rounded-t-[2.5rem]">
                    {/* User Info - Moved here to avoid overlap */}
                    <div className="mb-6 space-y-1 w-full px-4 text-center z-30">
                        {loading ? (
                            <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-full mx-auto" />
                        ) : (
                            <h3 className="text-2xl font-bold text-black drop-shadow-sm line-clamp-1">
                                {userData?.name}
                            </h3>
                        )}

                        {loading ? (
                            <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-full mx-auto mt-2" />
                        ) : (
                            <div className="inline-block px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider bg-slate-100 text-[#333333] border border-slate-200 shadow-sm mt-1">
                                ID: {userData?.studentId || "ST-XXXX"}
                            </div>
                        )}
                    </div>

                    <div className="mb-6 p-1 bg-white rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 transform transition-transform hover:scale-105 duration-300">
                        {/* Always white bg for QR readability */}
                        <div className="bg-white rounded-xl p-3">
                            {loading ? (
                                <div className="h-56 w-56 flex items-center justify-center">
                                    <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
                                </div>
                            ) : (
                                <motion.img
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(finalQrData)}`}
                                    alt="Student QR Code"
                                    className="h-56 w-56 object-contain rounded-lg opacity-90"
                                    style={{ imageRendering: "pixelated" }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="text-center w-full space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap px-2">Valid For</span>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full" />
                        </div>

                        <p className="text-lg font-bold text-black font-mono tracking-tight bg-slate-50 py-2 px-4 rounded-xl border border-slate-100 shadow-sm">
                            {displayDate}
                        </p>
                    </div>

                    <div className="mt-8 w-full">
                        <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium">
                            <span className="text-red-500">*</span> Do not share this QR code. It is unique to you.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
