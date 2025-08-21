"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"

export function DebugPanel() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  const [envVars, setEnvVars] = useState<any>({})
  const [tables, setTables] = useState<string[]>([])

  const testConnection = async () => {
    setStatus("loading")
    try {
      // Check environment variables
      setEnvVars({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      })

      // Test basic connection
      const { data, error } = await supabase.from("profiles").select("count").limit(1)

      if (error) throw error

      // List available tables
      const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables")

      if (tablesError) {
        // Fallback to a simpler approach
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("information_schema.tables")
            .select("table_name")
            .eq("table_schema", "public")

          if (!fallbackError && fallbackData) {
            setTables(fallbackData.map((t) => t.table_name))
          } else {
            // Try direct query to one of our tables to see if they exist
            const tableChecks = ["profiles", "properties", "reviews", "bookings", "inquiries", "favorites"]
            const existingTables = []

            for (const tableName of tableChecks) {
              try {
                await supabase.from(tableName).select("*").limit(0)
                existingTables.push(tableName)
              } catch {
                // Table doesn't exist or no access
              }
            }
            setTables(existingTables)
          }
        } catch {
          setTables(["Unable to query tables"])
        }
      } else {
        setTables(tablesData.map((t) => t.tablename))
      }

      setStatus("success")
      setMessage("Database connection successful!")
    } catch (error: any) {
      setStatus("error")
      setMessage(`Connection failed: ${error.message}`)
      console.error("Connection error:", error)
    }
  }

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  useEffect(() => {
    testConnection()
    checkUser()
  }, [])

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Debug Panel</CardTitle>
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

        <div className="text-sm space-y-2">
          <p>
            <strong>Environment Variables:</strong>
          </p>
          <ul className="list-disc pl-5">
            <li>NEXT_PUBLIC_SUPABASE_URL: {envVars.url}</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envVars.key}</li>
          </ul>
        </div>

        <div className="text-sm space-y-2">
          <p>
            <strong>Available Tables:</strong>
          </p>
          {tables.length > 0 ? (
            <ul className="list-disc pl-5">
              {tables.map((table) => (
                <li key={table}>{table}</li>
              ))}
            </ul>
          ) : (
            <p>No tables found or unable to query tables.</p>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-600">User Status: {user ? `Signed in as ${user.email}` : "Not signed in"}</p>
        </div>

        <Button onClick={testConnection} className="w-full">
          Test Again
        </Button>
      </CardContent>
    </Card>
  )
}
