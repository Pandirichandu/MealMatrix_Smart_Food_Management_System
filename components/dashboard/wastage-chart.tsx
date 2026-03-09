"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const defaultData = [
    { name: "Mon", total: 400, wastage: 240 },
    { name: "Tue", total: 300, wastage: 139 },
    { name: "Wed", total: 200, wastage: 980 },
    { name: "Thu", total: 278, wastage: 390 },
    { name: "Fri", total: 189, wastage: 480 },
    { name: "Sat", total: 239, wastage: 380 },
    { name: "Sun", total: 349, wastage: 430 },
]

interface WastageChartProps {
    data?: {
        name: string
        total: number
        wastage: number
    }[]
}

export function WastageChart({ data = defaultData }: WastageChartProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
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
                    contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                        boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'
                    }}
                />
                <Line
                    type="monotone"
                    strokeWidth={2}
                    dataKey="total"
                    activeDot={{
                        r: 6,
                        style: { fill: "hsl(var(--primary))", opacity: 0.25 },
                    }}
                    style={
                        {
                            stroke: "hsl(var(--primary))",
                        } as React.CSSProperties
                    }
                />
                <Line
                    type="monotone"
                    dataKey="wastage"
                    strokeWidth={2}
                    activeDot={{
                        r: 8,
                        style: { fill: "hsl(var(--primary))" },
                    }}
                    style={
                        {
                            stroke: "hsl(var(--primary))",
                        } as React.CSSProperties
                    }
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
