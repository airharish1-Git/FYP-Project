import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      // If there's a redirect parameter, use it
      if (redirect) {
        return NextResponse.redirect(new URL(redirect, requestUrl.origin));
      }

      // Otherwise, redirect based on user type
      if (profile?.is_host) {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      } else {
        return NextResponse.redirect(new URL("/search", requestUrl.origin));
      }
    }
  }

  // Default redirect to home
  return NextResponse.redirect(requestUrl.origin);
}
