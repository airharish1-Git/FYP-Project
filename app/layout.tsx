import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FavoritesProvider } from "@/lib/context/favorites-context";
import { cn } from "@/lib/utils";
import { VideoCallManagerProvider } from "@/components/video-call-manager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RoomFinder - Find Your Perfect Room or Hostel",
  description:
    "Real-time availability, virtual tours, direct chat with providers. Find your perfect accommodation fast, easy, and transparent.",
  keywords:
    "room finder, hostel booking, accommodation, real-time availability, virtual tours",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FavoritesProvider>
              <VideoCallManagerProvider>
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1 pt-16">{children}</main>
                  <Footer />
                </div>
              </VideoCallManagerProvider>
            </FavoritesProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
