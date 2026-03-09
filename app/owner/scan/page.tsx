"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, QrCode, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { LiveStats, LiveStatsData } from "@/components/dashboard/live-stats";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function ScanPage() {
    const [manualCode, setManualCode] = useState("");
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [liveStats, setLiveStats] = useState<LiveStatsData | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            // Cleanup scanner on unmount
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    // Fetch initial live stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/owner/live-stats`, { withCredentials: true });
                setLiveStats(res.data);
            } catch (err) {
                console.error("Failed to fetch live stats", err);
            }
        };
        fetchStats();
    }, []);

    // Start Camera when 'scanning' state becomes true
    useEffect(() => {
        if (scanning && mountedRef.current) {
            startScanner();
        } else {
            stopScanner();
        }
        // startScanner/stopScanner are stable or we ignore them as they are defined in component scope but don't change logic
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    const startScanner = async () => {
        try {
            // If already exists, clear it
            if (scannerRef.current) {
                await stopScanner();
            }

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            // Box size for both visual and logic
            const qrBoxSize = 250;

            const config = {
                fps: 10,
                // Make the scan region match the visual box exactly
                qrbox: { width: qrBoxSize, height: qrBoxSize },
                // Remove fixed aspect ratio to use full camera view
                // aspectRatio: 1.0, 
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleVerify(decodedText);
                    setScanning(false); // Stop scanning on success
                },
                (errorMessage) => {
                    // console.log(errorMessage); // Ignore scan errors
                }
            );
        } catch (err) {
            console.error("Failed to start scanner", err);
            toast.error("Camera access failed. Please use manual entry.");
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        // 1. Stop via library
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.error("Failed to stop scanner library", err);
            }
        }

        // 2. FORCE STOP: Manually find video element and kill tracks (Library sometimes fails to release)
        const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('Force stopped track:', track.label);
            });
            videoElement.srcObject = null;
        }
    };

    const handleVerify = async (inputData: string | React.FormEvent) => {
        if (typeof inputData !== 'string') {
            inputData.preventDefault();
            inputData = manualCode;
        }

        if (!inputData) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await axios.post(`${API_URL}/api/owner/scan`, {
                qrData: inputData
            }, { withCredentials: true });

            const successMsg = res.data.msg || "Verification Successful";

            setResult({
                success: true,
                msg: successMsg,
                studentName: res.data.studentName,
                mealType: res.data.mealType,
                items: res.data.items,
                totalPlates: res.data.totalPlates,
                time: res.data.timestamp || new Date().toLocaleTimeString()
            });

            // PIGGYBACK UPDATE: Update live stats instantly from response
            if (res.data.liveStats) {
                setLiveStats(res.data.liveStats);
            }

            toast.success(successMsg);
            setManualCode(""); // Clear input

        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data?.msg || "Verification Failed";

            // Special handling for "Already scanned" vs "Infalid"
            const isWarning = errorMsg.includes("Already") || errorMsg.includes("Duplicate");

            setResult({
                success: false,
                isWarning: isWarning,
                msg: errorMsg,
                time: new Date().toLocaleTimeString()
            });

            if (isWarning) toast.warning(errorMsg);
            else toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        // Optional: you can automatically open the scanner here if desired
        // setScanning(true); 
    };

    return (
        <div className="flex min-h-[85vh] flex-col items-center justify-start py-8 px-4 space-y-8 bg-gray-50 dark:bg-zinc-950">
            <div className="text-center space-y-2 animate-in slide-in-from-top-4 duration-500">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Scan Student QR</h2>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <QrCode className="w-4 h-4 mr-2" />
                    Verify Meal Eligibility
                </div>
            </div>

            {/* LIVE STATS BOARD */}
            <div className="w-full max-w-md">
                <LiveStats stats={liveStats} loading={!liveStats && loading} />
            </div>

            <div className="w-full max-w-md space-y-6 relative">

                {/* Result Card Overlay */}
                {result && (
                    <div className={`p-6 rounded-2xl shadow-2xl border-2 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center gap-4 ${result.success
                        ? "bg-white border-green-500/20 shadow-green-500/10 dark:bg-zinc-900 dark:border-green-500/20"
                        : "bg-white border-red-500/20 shadow-red-500/10 dark:bg-zinc-900 dark:border-red-500/20"
                        }`}>

                        {result.success ? (
                            <>
                                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-1 animate-in bounce-in duration-500">
                                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-green-700 dark:text-green-400 uppercase tracking-tight">VERIFIED</h3>
                                    <p className="text-xl font-bold text-foreground">{result.studentName}</p>
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700">
                                        {result.mealType}
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="w-full bg-slate-50 dark:bg-black/40 rounded-xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
                                    {result.items && result.items.length > 0 ? (
                                        result.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                                        // Fallback logic if veg/non-veg type isn't explicitly in item (using simple guess or default)
                                                        // Ideally backend sends type. If not, default to gray.
                                                        item.itemName?.toLowerCase().includes('chicken') || item.itemName?.toLowerCase().includes('egg') ? 'bg-red-500' : 'bg-green-500'
                                                        }`} />
                                                    <span className="font-semibold text-base text-foreground/90">{item.itemName}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-lg font-bold border border-slate-200 dark:border-white/10 shadow-sm min-w-[2.5rem] text-center">
                                                        ×{item.quantity}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No items found (Audit Only)</p>
                                    )}
                                </div>

                                <div className="w-full pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">TOTAL PLATES</span>
                                    <span className="text-2xl font-black text-primary">{result.totalPlates || 0}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-1 animate-in shake duration-500">
                                    <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">ACCESS DENIED</h3>
                                    <p className="text-lg font-medium opacity-90">{result.msg}</p>
                                </div>
                            </>
                        )}

                        <div className="w-full mt-2 flex justify-center">
                            <Button
                                onClick={handleReset}
                                className="w-full h-12 text-base font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100 transition-all shadow-md"
                            >
                                <QrCode className="w-5 h-5 mr-2 opacity-80" />
                                Scan Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Scanner / ID Input Section */}
                <Card className="overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardContent className="p-0 flex flex-col">

                        {/* Camera Preview Area */}
                        <div className="relative bg-black h-[300px] w-full flex items-center justify-center overflow-hidden group">

                            {/* The HTML element where html5-qrcode renders */}
                            <div id="reader" className={`w-full h-full ${!scanning ? "hidden" : ""}`}></div>

                            {!scanning && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                                    <div className="h-48 w-48 rounded-2xl border-2 border-white/20 border-dashed flex items-center justify-center">
                                        <Camera className="h-12 w-12 opacity-50" />
                                    </div>
                                    <p className="text-sm font-medium">Camera Inactive</p>
                                </div>
                            )}

                            {/* Scanning Overlay */}
                            {scanning && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-blue-500/50 rounded-lg"
                                        style={{ width: '250px', height: '250px' }}
                                    >
                                        <div className="absolute top-0 w-full h-1 bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    </div>
                                    <p className="absolute bottom-4 w-full text-center text-white/80 text-xs font-medium tracking-wider uppercase animate-pulse">Scanning...</p>
                                </div>
                            )}

                            {/* Controls */}
                            <div className="absolute bottom-4 right-4 z-10">
                                <Button
                                    size="icon"
                                    className={`rounded-full h-12 w-12 shadow-lg transition-all ${scanning ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
                                    onClick={() => setScanning(!scanning)}
                                >
                                    {scanning ? <XCircle className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                                </Button>
                            </div>
                        </div>

                        {/* Manual Entry */}
                        <div className="p-6 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                            <form onSubmit={handleVerify} className="flex gap-3">
                                <div className="relative flex-1">
                                    <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        className="pl-9 bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 focus-visible:ring-blue-500"
                                        placeholder="Enter Student ID (e.g. STU001)"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" disabled={!manualCode || loading} className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm hover:shadow-md transition-all">
                                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify"}
                                </Button>
                            </form>
                        </div>

                    </CardContent>
                </Card>
            </div>

            <style jsx global>{`
                @keyframes scan {
                  0%, 100% { top: 0%; opacity: 0.5; }
                  50% { top: 100%; opacity: 1; }
                }
            `}</style>
        </div>
    )
}
