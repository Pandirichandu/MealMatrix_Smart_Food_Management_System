"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const defaultData = [
    { name: "Mon", total: 400 },
    { name: "Tue", total: 300 },
    { name: "Wed", total: 500 },
    { name: "Thu", total: 280 },
    { name: "Fri", total: 590 },
    { name: "Sat", total: 320 },
    { name: "Sun", total: 380 },
]

interface OverviewProps {
    data?: {
        name: string
        total: number
    }[]
}

export function Overview({ data = defaultData }: OverviewProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                        boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'
                    }}
                />
                <Bar
                    dataKey="total"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
