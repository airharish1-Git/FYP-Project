"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  MessageSquare,
  Calendar,
  Star,
  BarChart3,
  Settings,
  Plus,
  Bell,
  User,
  Building2,
  Heart,
  Search,
} from "lucide-react";

const hostMenuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Listings", href: "/dashboard/listings" },
  { icon: MessageSquare, label: "Inquiries", href: "/dashboard/inquiries" },
  { icon: Calendar, label: "Manage Bookings", href: "/dashboard/bookings" },
];

const buyerMenuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Browse Listings", href: "/listings" },
  { icon: MessageSquare, label: "My Inquiries", href: "/dashboard/inquiries" },
  { icon: Calendar, label: "My Bookings", href: "/dashboard/bookings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isHost } = useAuth();
  const menuItems = isHost ? hostMenuItems : buyerMenuItems;

  return (
    <div className="w-64 bg-card border-r min-h-screen">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Dashboard</h2>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
