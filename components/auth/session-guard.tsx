"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/config";

export function SessionGuard() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const isProtectedRoute = 
            pathname.startsWith("/student") || 
            pathname.startsWith("/owner") || 
            pathname.startsWith("/admin");

        if (isProtectedRoute) {
            const sessionActive = sessionStorage.getItem("sessionActive");
            if (!sessionActive) {
                // Clear backend cookie and redirect to login
                axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true })
                    .catch(() => {})
                    .finally(() => {
                        router.push("/login");
                    });
            }
        }
    }, [pathname, router]);

    return null;
}
