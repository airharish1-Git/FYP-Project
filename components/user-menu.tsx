"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";
import {
  LogOut,
  Settings,
  User,
  Home,
  Star,
  MessageSquare,
  Building2,
  Search,
  Plus,
  Calendar,
} from "lucide-react";

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    is_host: boolean;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full hover:bg-muted/50 z-10"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatar_url || ""}
              alt={user.full_name || ""}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.full_name
                ? user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        forceMount
        style={{ zIndex: 1000 }}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.is_host ? (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/listings" className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>My Listings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/inquiries" className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Inquiries</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/add-listing" className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add New Listing</span>
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>My Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/favorites" className="cursor-pointer">
                  <Star className="mr-2 h-4 w-4" />
                  <span>My Favorites</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bookings" className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>My Bookings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/inquiries" className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>My Inquiries</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/search" className="cursor-pointer">
                  <Search className="mr-2 h-4 w-4" />
                  <span>Find Properties</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isLoading}
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
