import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 border-transparent hover:scale-[1.02] hover:shadow-blue-500/40",
                destructive:
                    "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 hover:scale-[1.02]",
                outline:
                    "border-2 border-slate-200 bg-transparent hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-50 hover:scale-[1.02]",
                secondary:
                    "bg-white border-2 border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 dark:bg-zinc-900 dark:border-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/20 hover:scale-[1.02]",
                ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
                link: "text-blue-600 underline-offset-4 hover:underline dark:text-blue-400",
            },
            size: {
                default: "h-11 px-6 py-2.5 rounded-xl",
                sm: "h-9 rounded-lg px-4",
                lg: "h-12 rounded-2xl px-8 text-base",
                icon: "h-10 w-10 rounded-xl",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
