"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"

export function TestConnection() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [user, setUser] = useState<any>(null)

  const testConnection = async () => {
    setStatus("loading")
    try {
      // Test basic connection
      const { data, error } = await supabase.from("profiles").select("count").limit(1)

      if (error) throw error

      setStatus("success")
      setMessage("Database connection successful!")
    } catch (error: any) {
      setStatus("error")
      setMessage(`Connection failed: ${error.message}`)
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
        <CardTitle>Database Connection Test</CardTitle>
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
