"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/config";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            setSubmitted(true);
            toast.success("Reset link sent", {
                description: res.data.message
            });
        } catch (error: any) {
            console.error(error);
            // Generic error or specific if safe
            toast.error("An error occurred. Please try again.");
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
                                <Mail className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-extrabold tracking-tight text-white">
                                Forgot Password?
                            </CardTitle>
                            <CardDescription className="text-base font-medium text-slate-400">
                                No worries, we'll send you reset instructions.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-10">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2 group">
                                    <Label htmlFor="email" className="text-sm font-semibold text-slate-300">Email address</Label>
                                    <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                        <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
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
                                            <span>Sending...</span>
                                        </div>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6 animate-in fade-in duration-500">
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                    If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
                                </div>
                                <Button
                                    onClick={() => setSubmitted(false)}
                                    variant="outline"
                                    className="w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                                >
                                    Try another email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
