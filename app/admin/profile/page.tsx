"use client"

import { PasswordForm } from "@/components/profile/password-form"
import { ProfileForm } from "@/components/profile/profile-form"

export default function AdminProfilePage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto py-6">
            <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
            <div className="space-y-8">
                <ProfileForm />
                <PasswordForm />
            </div>
        </div>
    )
}
