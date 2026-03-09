"use client";

import { useState, use } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/config";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password });
            toast.success("Password Reset Successful", {
                description: "You can now login with your new password."
            });
            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.msg || "Reset failed. Token may be invalid or expired.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-blue-100 text-foreground">

            {/* Background Image & Overlay */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/home-bg.jpg')",
                    filter: "blur(6px)",
                    transform: "scale(1.05)"
                }}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-0 bg-black/60" aria-hidden="true" />

            <div className="w-full max-w-[440px] px-6 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">

                <div className="mb-8 text-center flex justify-center">
                    <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
                    </Link>
                </div>

                <Card className="border-white/10 shadow-2xl bg-black/40 backdrop-blur-md ring-1 ring-white/10 rounded-2xl overflow-hidden">
                    <CardHeader className="space-y-4 text-center pb-8 pt-10 px-8 bg-transparent">
                        <div className="flex justify-center mb-2">
                            <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <KeyRound className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-extrabold tracking-tight text-white">
                                Set New Password
                            </CardTitle>
                            <CardDescription className="text-base font-medium text-slate-400">
                                Create a strong password for your account
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2 group">
                                <Label htmlFor="password" className="text-sm font-semibold text-slate-300">New Password</Label>
                                <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                    <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 pr-10 h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-300">Confirm Password</Label>
                                <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                    <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="pl-10 h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-lg"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-blue-500/20 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Resetting...</span>
                                    </div>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
