"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<"buyer" | "host">("buyer");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const isSignUp = searchParams.get("mode") === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              is_host: userType === "host",
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        router.push("/auth?mode=signin");
      } else {
        const { error } = await signIn({
          email,
          password,
        });

        if (error) throw error;

        router.push("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {isSignUp ? "Create an account" : "Sign in to your account"}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isSignUp
            ? "Enter your details to create your account"
            : "Enter your credentials to access your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isSignUp && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userType">I am a</Label>
              <Select
                value={userType}
                onValueChange={(value: "buyer" | "host") => setUserType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Looking for a room</SelectItem>
                  <SelectItem value="host">Listing a property</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
