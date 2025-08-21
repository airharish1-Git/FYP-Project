"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

interface Listing {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  price_per_month: number;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  images: string[];
  created_at: string;
  host_id: string;
  status: "available" | "sold" | "pending";
}

interface Inquiry {
  id: string;
  property: Listing;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isHost, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setLoading(false); // Ensure loading is reset
        router.push("/?redirect=/dashboard");
        return;
      }
      setListings([]); // Reset listings on user change
      setInquiries([]); // Reset inquiries on user change
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false); // Ensure loading is reset
      return;
    }

    try {
      setLoading(true);

      if (isHost) {
        // Fetch listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("properties")
          .select("*")
          .eq("host_id", user.id)
          .order("created_at", { ascending: false });

        if (listingsError) throw listingsError;
        setListings(listingsData || []);

        // Fetch inquiries for host
        const { data: inquiriesData, error: inquiriesError } = await supabase
          .from("inquiries")
          .select(
            `
            *,
            property:properties (*),
            user:profiles!inquiries_sender_id_fkey (id, full_name, email)
          `
          )
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false });

        if (inquiriesError) throw inquiriesError;
        setInquiries(inquiriesData || []);
      } else {
        // Fetch user's inquiries
        const { data: inquiriesData, error: inquiriesError } = await supabase
          .from("inquiries")
          .select(
            `
            *,
            property:properties (*),
            user:profiles!inquiries_sender_id_fkey (id, full_name, email)
          `
          )
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false });

        if (inquiriesError) throw inquiriesError;
        setInquiries(inquiriesData || []);
      }
    } catch (error: any) {
      setListings([]); // Reset listings on error
      setInquiries([]); // Reset inquiries on error
      setLoading(false); // Ensure loading is reset
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
      return;
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {isHost ? (
        <>
          <AnalyticsDashboard />

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Listings</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.slice(0, 3).map((listing) => (
                <Card key={listing.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{listing.title}</span>
                      <Badge
                        variant={
                          listing.status === "sold"
                            ? "destructive"
                            : listing.status === "pending"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {listing.status.charAt(0).toUpperCase() +
                          listing.status.slice(1)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {listing.address}
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(listing.price_per_month)}/month
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {listing.bedrooms} beds
                        </Badge>
                        <Badge variant="secondary">
                          {listing.bathrooms} baths
                        </Badge>
                        <Badge variant="secondary">
                          {listing.max_occupants} max
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Inquiries</h2>
            <div className="space-y-4">
              {inquiries.slice(0, 3).map((inquiry) => (
                <Card key={inquiry.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{inquiry.property.title}</span>
                      <Badge
                        variant={
                          inquiry.status === "pending"
                            ? "secondary"
                            : inquiry.status === "accepted"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">From:</p>
                        <p className="text-sm text-muted-foreground">
                          {inquiry.user.full_name} ({inquiry.user.email})
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Message:</p>
                        <p className="text-sm text-muted-foreground">
                          {inquiry.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">My Inquiries</h2>
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <Card key={inquiry.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{inquiry.property.title}</span>
                      <Badge
                        variant={
                          inquiry.status === "pending"
                            ? "secondary"
                            : inquiry.status === "accepted"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Message:</p>
                        <p className="text-sm text-muted-foreground">
                          {inquiry.message}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Status:</p>
                        <p className="text-sm text-muted-foreground">
                          {inquiry.status.charAt(0).toUpperCase() +
                            inquiry.status.slice(1)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
