"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props} />
))
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-transparent p-1 text-muted-foreground gap-2",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    // Note: This is a simplified mock. Ideally use Radix. 
    // For now we just render a button. State logic would be needed for real interactivity without Radix.
    // However, since we are "Designing", for visual fidelity we need it to look right.
    // But without logic, clicking won't switch content.
    // I'll make it a simple client component with context if possible, or just a dumb button for now if I can't easily do context.
    // Actually, I'll use a simple state here for a fully working mock.

    // Changing approach: This file exports standard UI components, but they need to talk.
    // I'll assume for the "Blueprint" it's okay if tabs don't perfectly switch OR I'll write a better custom implementation.

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-blue-600 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800",
                className
            )}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
        )}
        {...props}
    />
))
TabsContent.displayName = "TabsContent"

// Re-export full implementation below with Context to make it clicky
import { createContext, useContext, useState, useEffect } from "react"

interface TabsContextValue {
    activeTab: string
    setActiveTab: (val: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function TabsRoot({ defaultValue, value, onValueChange, children, className, ...props }: any) {
    // Support both controlled and uncontrolled modes
    // If 'value' is provided, use it. Otherwise use internal state.
    const isControlled = value !== undefined;
    const [internalState, setInternalState] = useState(defaultValue || "");

    const activeTab = isControlled ? value : internalState;

    const setActiveTab = (val: string) => {
        if (!isControlled) {
            setInternalState(val);
        }
        if (onValueChange) {
            onValueChange(val);
        }
    }

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={cn("w-full", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

function TabsListImpl({ className, ...props }: any) {
    return (
        <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-transparent p-1 text-muted-foreground gap-2", className)} {...props} />
    )
}

function TabsTriggerImpl({ className, value, children, ...props }: any) {
    const context = useContext(TabsContext)
    const isActive = context?.activeTab === value
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all disabled:pointer-events-none disabled:opacity-50 border",
                isActive
                    ? "bg-blue-600 text-white shadow-md border-blue-600 hover:bg-blue-700 hover:text-white"
                    : "bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900",
                className
            )}
            onClick={() => context?.setActiveTab(value)}
            type="button" // Prevent form submission
            data-state={isActive ? "active" : "inactive"}
            {...props}
        >
            {children}
        </button>
    )
}

function TabsContentImpl({ className, value, children, ...props }: any) {
    const context = useContext(TabsContext)
    if (context?.activeTab !== value) return null
    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)} {...props}>
            {children}
        </div>
    )
}

// Exporting the interactive versions
export { TabsRoot as Tabs, TabsListImpl as TabsList, TabsTriggerImpl as TabsTrigger, TabsContentImpl as TabsContent }
