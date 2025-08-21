"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Menu,
  X,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Star,
  User,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "./user-menu";
import { supabase } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/auth-modal";
import { useFavorites } from "@/lib/context/favorites-context";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isHost, loading } = useAuth();
  const { favoritesCount } = useFavorites();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-background/80 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Home className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              RoomFinder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {(!user || !isHost) && (
              <Link
                href="/search"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Find Properties
              </Link>
            )}
            {user && isHost && (
              <>
                <Link
                  href="/add-listing"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  List Your Space
                </Link>
                <Link
                  href="/dashboard"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/listings"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  My Listings
                </Link>
                <Link
                  href="/dashboard/inquiries"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Inquiries
                </Link>
              </>
            )}
            {user && !isHost && (
              <>
                <Link
                  href="/favorites"
                  className="text-foreground hover:text-primary transition-colors font-medium relative"
                >
                  My Favorites
                  {favoritesCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-6 h-5 min-w-5 flex items-center justify-center px-1"
                    >
                      {favoritesCount}
                    </Badge>
                  )}
                </Link>
                <Link
                  href="/bookings"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  My Bookings
                </Link>
              </>
            )}
            <ThemeToggle />
            {!loading && (
              <>
                {!user ? (
                  <div className="flex items-center space-x-4">
                    <AuthModal>
                      <Button variant="ghost" className="font-medium">
                        Sign In
                      </Button>
                    </AuthModal>
                    <AuthModal defaultTab="signup">
                      <Button variant="default" className="font-medium">
                        Get Started
                      </Button>
                    </AuthModal>
                  </div>
                ) : (
                  <UserMenu
                    user={{
                      id: user.id,
                      email: user.email!,
                      full_name: user.user_metadata?.full_name,
                      avatar_url: user.user_metadata?.avatar_url,
                      is_host: isHost,
                    }}
                  />
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            {(!user || !isHost) && (
              <Link
                href="/search"
                className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Building2 className="h-4 w-4" />
                <span>Find Rooms</span>
              </Link>
            )}
            {user && isHost && (
              <>
                <Link
                  href="/add-listing"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  <span>List Your Space</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/dashboard/listings"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  <span>My Listings</span>
                </Link>
                <Link
                  href="/dashboard/inquiries"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Inquiries</span>
                </Link>
              </>
            )}
            {user && !isHost && (
              <>
                <Link
                  href="/favorites"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium relative"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Star className="h-4 w-4" />
                  <span>My Favorites</span>
                  {favoritesCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 min-w-5 flex items-center justify-center px-1"
                    >
                      {favoritesCount}
                    </Badge>
                  )}
                </Link>
                <Link
                  href="/bookings"
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  <span>My Bookings</span>
                </Link>
              </>
            )}
            {!loading && (
              <>
                {!user ? (
                  <div className="space-y-2 pt-4">
                    <AuthModal>
                      <Button variant="ghost" className="w-full font-medium">
                        Sign In
                      </Button>
                    </AuthModal>
                    <AuthModal defaultTab="signup">
                      <Button variant="default" className="w-full font-medium">
                        Get Started
                      </Button>
                    </AuthModal>
                  </div>
                ) : (
                  <div className="space-y-2 pt-4">
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>

                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:text-destructive font-medium"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        supabase.auth.signOut();
                      }}
                    >
                      Log out
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
