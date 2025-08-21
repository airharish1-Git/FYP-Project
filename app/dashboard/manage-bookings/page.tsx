"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Home,
  MapPin,
  DollarSign,
  MessageSquare,
  User,
  Phone,
} from "lucide-react";
import Image from "next/image";

interface Booking {
  id: string;
  status: string;
  created_at: string;
  move_in_date: string;
  duration_months: number;
  property: {
    id: string;
    title: string;
    description: string;
    price_per_month: number;
    address: string;
    city: string;
    state: string;
    country: string;
    images: string[];
    host: {
      id: string;
      full_name: string;
      email: string;
    };
  };
  tenant: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function ManageBookingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            id,
            status,
            created_at,
            move_in_date,
            duration_months,
            property:properties (
              id,
              title,
              description,
              price_per_month,
              address,
              city,
              state,
              country,
              images,
              host:profiles (
                id,
                full_name,
                email
              )
            ),
            tenant:profiles (
              id,
              full_name,
              email,
              phone
            )
          `
          )
          .eq("host_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform the data to match the Booking interface
        const transformedBookings: Booking[] = (data || []).map(
          (booking: any) => {
            // Ensure we have valid host data
            const host = booking.property?.host?.[0] || {
              id: "",
              full_name: "Unknown Host",
              email: "",
            };

            return {
              id: booking.id,
              status: booking.status,
              created_at: booking.created_at,
              move_in_date: booking.move_in_date,
              duration_months: booking.duration_months,
              property: {
                id: booking.property.id,
                title: booking.property.title,
                description: booking.property.description,
                price_per_month: booking.property.price_per_month,
                address: booking.property.address,
                city: booking.property.city,
                state: booking.property.state,
                country: booking.property.country,
                images: booking.property.images || [],
                host: host,
              },
              tenant: {
                id: booking.tenant.id,
                full_name: booking.tenant.full_name,
                email: booking.tenant.email,
                phone: booking.tenant.phone,
              },
            };
          }
        );

        setBookings(transformedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({
          title: "Error",
          description: "Failed to fetch bookings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-yellow-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Manage Bookings</h1>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't received any bookings yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={booking.property.images[0] || "/placeholder.jpg"}
                      alt={booking.property.title}
                      fill
                      className="object-cover"
                    />
                    <Badge
                      className={`absolute top-2 right-2 ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status.charAt(0).toUpperCase() +
                        booking.status.slice(1)}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">
                      {booking.property.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {booking.property.address}, {booking.property.city}
                        {booking.property.state
                          ? `, ${booking.property.state}`
                          : ""}
                        , {booking.property.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">
                        Rs. {booking.property.price_per_month.toLocaleString()}
                        /month
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Move-in: {formatDate(booking.move_in_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Duration: {booking.duration_months} months
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Tenant: {booking.tenant.full_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">
                        Phone: {booking.tenant.phone}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        router.push(`/messages?property=${booking.property.id}`)
                      }
                    >
                      View Conversation
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
