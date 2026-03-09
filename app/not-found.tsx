import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center space-y-6 text-center">
                <div className="rounded-full bg-orange-100 p-6 dark:bg-orange-900/20">
                    <FileQuestion className="h-12 w-12 text-orange-600 dark:text-orange-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-gray-900 dark:text-gray-50">Page not found</h1>
                    <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed dark:text-gray-400">
                        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                    </p>
                </div>
                <Link href="/">
                    <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                        Go back home
                    </Button>
                </Link>
            </div>
        </div>
    )
}
