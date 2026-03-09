"use client"

import { PasswordForm } from "@/components/profile/password-form"

export default function StudentProfilePage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto py-6">
            <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
            {/* Students can only change password */}
            <PasswordForm />
        </div>
    )
}
