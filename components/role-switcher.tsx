"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Home, Search, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface RoleSwitcherProps {
  user: {
    id: string
    email: string
    full_name?: string
    is_host: boolean
  }
}

export function RoleSwitcher({ user }: RoleSwitcherProps) {
  const [isHost, setIsHost] = useState(user.is_host)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleRoleChange = async (newIsHost: boolean) => {
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("profiles").update({ is_host: newIsHost }).eq("id", user.id)

      if (error) throw error

      setIsHost(newIsHost)
      setMessage(`Successfully switched to ${newIsHost ? "Property Lister" : "Property Searcher"} mode!`)

      // Redirect to appropriate page
      setTimeout(() => {
        if (newIsHost) {
          router.push("/dashboard")
        } else {
          router.push("/search")
        }
        window.location.reload() // Force header update
      }, 1500)
    } catch (error: any) {
      setMessage(`Error updating role: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Account Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="font-medium">Property Searcher</Label>
                <p className="text-sm text-gray-600">Find and book accommodations</p>
              </div>
            </div>
            <Switch checked={!isHost} onCheckedChange={(checked) => handleRoleChange(!checked)} disabled={loading} />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Home className="h-5 w-5 text-green-600" />
              <div>
                <Label className="font-medium">Property Lister</Label>
                <p className="text-sm text-gray-600">List and manage properties</p>
              </div>
            </div>
            <Switch checked={isHost} onCheckedChange={handleRoleChange} disabled={loading} />
          </div>
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Updating account type...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
