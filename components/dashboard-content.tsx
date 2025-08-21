"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

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
}

interface Inquiry {
  id: string;
  property_id: string;
  user_id: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  property: {
    title: string;
    address: string;
  };
  user: {
    full_name: string;
    email: string;
  };
}

interface DashboardContentProps {
  listings: Listing[];
  inquiries: Inquiry[];
  onRefresh: () => Promise<void>;
}

export function DashboardContent({
  listings,
  inquiries,
  onRefresh,
}: DashboardContentProps) {
  const router = useRouter();
  const { isHost } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const handleInquiryStatus = async (
    inquiryId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", inquiryId);

      if (error) throw error;

      await onRefresh();
    } catch (error) {
      console.error("Error updating inquiry status:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {isHost && (
          <Button onClick={() => router.push("/add-listing")}>
            Add New Listing
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isHost && <TabsTrigger value="listings">My Listings</TabsTrigger>}
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{listings.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inquiries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inquiries.filter((i) => i.status === "pending").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Accepted Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inquiries.filter((i) => i.status === "accepted").length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isHost && (
          <TabsContent value="listings" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{listing.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/edit-listing/${listing.id}`)
                        }
                      >
                        Edit
                      </Button>
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
          </TabsContent>
        )}

        <TabsContent value="inquiries" className="mt-6">
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
                    {isHost && inquiry.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleInquiryStatus(inquiry.id, "accepted")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleInquiryStatus(inquiry.id, "rejected")
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
