"use client";

import type React from "react";

import { useState, useEffect } from "react";

import { RoleSwitcher } from "@/components/role-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setProfile(profile);
          setFormData({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            bio: profile.bio || "",
          });
        }
      }

      setLoading(false);
    };

    getUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Profile updated successfully!");
      setProfile({ ...profile, ...formData });
    } catch (error: any) {
      setMessage(`Error updating profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const profileContent = (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Profile Settings
              </h1>
              <p className="text-gray-600">
                Manage your account information and preferences
              </p>
            </div>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {profile?.full_name || "User"}
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself"
                    />
                  </div>

                  {message && (
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Role Switcher */}
            <RoleSwitcher
              user={{
                id: user.id,
                email: user.email,
                full_name: profile?.full_name,
                is_host: profile?.is_host || false,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthGuard
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="pt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in to view your profile
              </h1>
              <p className="text-gray-600 mb-8">
                Manage your account settings and preferences.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {profileContent}
    </AuthGuard>
  );
}
