"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Home,
  Search,
  CheckCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface AuthModalProps {
  children: React.ReactNode;
  defaultTab?: "signin" | "signup";
}

export function AuthModal({ children, defaultTab = "signin" }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [signedUpEmail, setSignedUpEmail] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    userType: "searcher", // 'searcher' or 'lister'
  });

  const ensureProfile = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          is_host: user.user_metadata?.is_host || false,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      }

      return existingProfile;
    } catch (error) {
      console.error("Error ensuring profile:", error);
      return null;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email or password. Please check your credentials."
          );
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error(
            "Please check your email and click the confirmation link before signing in."
          );
        }
        throw error;
      }

      if (data.user) {
        // Ensure profile exists
        await ensureProfile(data.user);

        // Get user profile to determine redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        setIsOpen(false);
        setSignInData({ email: "", password: "" }); // Clear form

        // Get redirect URL from query params
        const redirect = searchParams.get("redirect");

        // Redirect based on user type and redirect parameter
        if (redirect) {
          router.push(redirect);
        } else if (profile?.is_host) {
          router.push("/dashboard");
        } else {
          router.push("/search");
        }

        // Force a page refresh to update the header
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
            phone: signUpData.phone,
            is_host: signUpData.userType === "lister",
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setSignedUpEmail(signUpData.email); // Store the email for resending
        setSuccess("Check your email for the confirmation link!");
        setSignUpData({
          email: "",
          password: "",
          fullName: "",
          phone: "",
          userType: "searcher",
        }); // Clear form
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirect = searchParams.get("redirect");
      const redirectTo = redirect
        ? `${
            window.location.origin
          }/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!signedUpEmail) {
      setError("No email found to resend. Please try signing up again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: signedUpEmail,
      });

      if (error) throw error;

      setSuccess("Confirmation email sent again! Please check your inbox.");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle>Welcome to RoomFinder</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={signInData.email}
                    onChange={(e) =>
                      setSignInData({ ...signInData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    value={signInData.password}
                    onChange={(e) =>
                      setSignInData({ ...signInData, password: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or click
                    the button below to resend.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email Address</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={signedUpEmail}
                      onChange={(e) => setSignedUpEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <Button
                    onClick={handleResendConfirmation}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || !signedUpEmail}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Resend Confirmation Email
                  </Button>

                  <Button
                    onClick={() => {
                      setSuccess(null);
                      setError(null);
                      setSignedUpEmail(""); // Clear stored email when going back
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Sign Up
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                      value={signUpData.fullName}
                      onChange={(e) =>
                        setSignUpData({
                          ...signUpData,
                          fullName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={signUpData.email}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="pl-10"
                      value={signUpData.phone}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      className="pl-10"
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData({
                          ...signUpData,
                          password: e.target.value,
                        })
                      }
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>I want to:</Label>
                  <RadioGroup
                    value={signUpData.userType}
                    onValueChange={(value) =>
                      setSignUpData({ ...signUpData, userType: value })
                    }
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-gray-50">
                      <RadioGroupItem value="searcher" id="searcher" />
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-blue-600" />
                        <div>
                          <Label
                            htmlFor="searcher"
                            className="font-medium cursor-pointer"
                          >
                            Find a place to stay
                          </Label>
                          <p className="text-xs text-gray-600">
                            Search and book rooms, hostels, and apartments
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-gray-50">
                      <RadioGroupItem value="lister" id="lister" />
                      <div className="flex items-center space-x-2">
                        <Home className="h-4 w-4 text-green-600" />
                        <div>
                          <Label
                            htmlFor="lister"
                            className="font-medium cursor-pointer"
                          >
                            List my property
                          </Label>
                          <p className="text-xs text-gray-600">
                            Rent out rooms, hostels, or apartments
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Account
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
