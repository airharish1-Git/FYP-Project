"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthState {
  user: User | null;
  isHost: boolean;
  loading: boolean;
  signIn: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ error: any }>;
  signUp: (credentials: {
    email: string;
    password: string;
    options?: {
      data: {
        full_name: string;
        is_host: boolean;
      };
    };
  }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkHostStatus(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkHostStatus(session.user.id);
      } else {
        setIsHost(false);
      }
      setLoading(false);
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const checkHostStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_host")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setIsHost(data?.is_host || false);
    } catch (error) {
      console.error("Error checking host status:", error);
      setIsHost(false);
    }
  };

  const signIn = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async ({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: {
      data: {
        full_name: string;
        is_host: boolean;
      };
    };
  }) => {
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (signUpError) throw signUpError;

      // Create profile with host status
      if (options?.data) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: (await supabase.auth.getUser()).data.user?.id,
            full_name: options.data.full_name,
            is_host: options.data.is_host,
          },
        ]);

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    isHost,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
