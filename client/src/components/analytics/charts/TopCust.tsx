"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getTopCust, TopCustomer } from "@/utils/api/getTopCust"
import { Users } from "lucide-react"

export const description = "Top customers leaderboard"

export function TopCustomers() {
  const [customers, setCustomers] = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopCustomers = async () => {
      try {
        setLoading(true)
        setError(null)
        const topCustomers = await getTopCust(10) // Get top 10 customers
        setCustomers(topCustomers)
      } catch (err) {
        console.error("Error fetching top customers:", err)
        setError("Failed to load customer data")
      } finally {
        setLoading(false)
      }
    }

    fetchTopCustomers()
  }, [])

  return (
    <Card className="flex flex-col min-h-[280px] pb-4" style={{ width: "100%" }}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">Top Customers</h2>
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Highest spending customers ranked by total expenditure
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-sm text-gray-500">Loading customer data...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-sm text-gray-500">No customer data available</div>
          </div>
        ) : (
          <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {customers.map((customer, index) => {
              const isTopThree = index < 3;
              const rankColors = {
                0: "bg-yellow-100 text-yellow-800 border-yellow-200",
                1: "bg-gray-100 text-gray-800 border-gray-200", 
                2: "bg-orange-100 text-orange-800 border-orange-200"
              };
              
              return (
                <div
                  key={customer.cust_id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isTopThree 
                      ? `${rankColors[index as keyof typeof rankColors]}`
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isTopThree 
                        ? index === 0 
                          ? "bg-yellow-500 text-white" 
                          : index === 1 
                            ? "bg-gray-400 text-white"
                            : "bg-orange-500 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-sm">
                        {customer.cust_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Customer ID: {customer.cust_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">
                      ₱{customer.total_expenditure.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total Spent
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
