"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UtensilsCrossed, ArrowLeft, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/config";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/auth/login`,
                { email, password },
                { withCredentials: true }
            );

            const { user } = res.data;

            toast.success("Login Successful", {
                description: `Welcome back, ${user.name}`
            });

            if (user.role === "admin") router.push("/admin");
            else if (user.role === "owner") router.push("/owner");
            else if (user.role === "student") router.push("/student");
            else toast.error("Unknown Role");

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.msg || "Login failed";
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
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Link>
                </div>

                <Card className="border-white/10 shadow-2xl bg-black/40 backdrop-blur-md ring-1 ring-white/10 rounded-2xl overflow-hidden">
                    <CardHeader className="space-y-4 text-center pb-8 pt-10 px-8 bg-transparent">
                        <div className="flex justify-center mb-2">
                            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-blue-900/20 transform transition-transform hover:scale-110 duration-300">
                                <UtensilsCrossed className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-extrabold tracking-tight text-white">
                                Welcome Back <span className="animate-wave inline-block origin-bottom-right hover:rotate-12 transition-transform">👋</span>
                            </CardTitle>
                            <CardDescription className="text-base font-medium text-slate-400">
                                Sign in to continue to your dashboard
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-10">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2 group">
                                <Label htmlFor="email" className="text-sm font-semibold text-slate-300">Email address</Label>
                                <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                    <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-10 h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-semibold text-slate-300">Password</Label>
                                    <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline hover:underline-offset-4 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
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

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-blue-500/20 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Authentication...</span>
                                    </div>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account? <Link href="#" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">Contact Admin</Link>
                </p>
            </div>
        </div>
    );
}
