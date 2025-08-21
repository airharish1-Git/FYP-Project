"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"

export function SimpleDebug() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({})

  const testTables = async () => {
    const tables = ["profiles", "properties", "reviews", "bookings", "inquiries", "favorites"]
    const results: Record<string, boolean> = {}

    for (const tableName of tables) {
      try {
        const { error } = await supabase.from(tableName).select("*").limit(0)
        results[tableName] = !error
      } catch {
        results[tableName] = false
      }
    }

    setTableStatus(results)
  }

  const testConnection = async () => {
    setStatus("loading")
    try {
      // Test basic connection by trying to access profiles table
      const { data, error } = await supabase.from("profiles").select("count").limit(1)

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`)
      }

      await testTables()

      setStatus("success")
      setMessage("Database connection successful!")
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message)
      console.error("Connection error:", error)
    }
  }

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error) throw error
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    }
  }

  const checkEnvironment = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      setStatus("error")
      setMessage("Missing environment variables. Please check your .env.local file.")
      return false
    }
    return true
  }

  useEffect(() => {
    if (checkEnvironment()) {
      testConnection()
      checkUser()
    }
  }, [])

  const tableCount = Object.values(tableStatus).filter(Boolean).length
  const totalTables = Object.keys(tableStatus).length

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && (
          <Alert>
            <AlertDescription>Testing connection...</AlertDescription>
          </Alert>
        )}

        {status === "success" && (
          <Alert>
            <AlertDescription className="text-green-600">{message}</AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Environment</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Supabase URL:</span>
                <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? "text-green-600" : "text-red-600"}>
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Anon Key:</span>
                <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-600" : "text-red-600"}>
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Authentication</h3>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>User Status:</span>
                <span className={user ? "text-green-600" : "text-gray-600"}>
                  {user ? `✓ ${user.email}` : "Not signed in"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">
            Database Tables ({tableCount}/{totalTables})
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(tableStatus).map(([table, exists]) => (
              <div key={table} className="flex justify-between">
                <span>{table}:</span>
                <span className={exists ? "text-green-600" : "text-red-600"}>{exists ? "✓ Exists" : "✗ Missing"}</span>
              </div>
            ))}
          </div>
        </div>

        {tableCount === 0 && status === "success" && (
          <Alert variant="destructive">
            <AlertDescription>
              No database tables found. Please run the setup-database.sql script in your Supabase SQL editor.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={testConnection} className="w-full">
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}
