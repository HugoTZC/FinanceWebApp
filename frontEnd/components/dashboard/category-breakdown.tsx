"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Housing", value: 1800, color: "#4ade80" },
  { name: "Food", value: 800, color: "#60a5fa" },
  { name: "Transportation", value: 600, color: "#f87171" },
  { name: "Entertainment", value: 400, color: "#fbbf24" },
  { name: "Utilities", value: 350, color: "#a78bfa" },
  { name: "Other", value: 250, color: "#fb923c" },
]

export function CategoryBreakdown() {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`$${value}`, ""]}
            labelStyle={{ color: "black" }}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

