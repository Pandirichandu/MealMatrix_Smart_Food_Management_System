import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-900">
            <Sidebar role="student" />
            <div className="flex flex-1 flex-col">
                <Header title="Student Portal" />
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
