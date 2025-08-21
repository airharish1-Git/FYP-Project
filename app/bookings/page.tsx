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
  Star,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { ReviewForm } from "@/components/review-form";
import Link from "next/link";

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
}

export default function BookingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<
    string | null
  >(null);
  const [hasReviewed, setHasReviewed] = useState<Record<string, boolean>>({});

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
            property:properties!bookings_property_id_fkey (
              id,
              title,
              description,
              price_per_month,
              address,
              city,
              state,
              country,
              images,
              host:profiles!properties_host_id_fkey (
                id,
                full_name,
                email
              )
            )
          `
          )
          .eq("tenant_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform the data to match the Booking interface
        const transformedBookings: Booking[] = (data || []).map(
          (booking: any) => {
            // Ensure we have valid host data
            const host = booking.property?.host || {
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
            };
          }
        );

        setBookings(transformedBookings);

        // Check which properties have been reviewed
        const { data: reviews } = await supabase
          .from("reviews")
          .select("property_id")
          .eq("reviewer_id", user.id);

        const reviewedProperties = (reviews || []).reduce(
          (acc, review) => ({
            ...acc,
            [review.property_id]: true,
          }),
          {}
        );

        setHasReviewed(reviewedProperties);
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

  const handleReviewSubmitted = () => {
    setSelectedBookingForReview(null);
    // Update the hasReviewed state for this property
    if (selectedBookingForReview) {
      setHasReviewed((prev) => ({
        ...prev,
        [selectedBookingForReview]: true,
      }));
    }
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
            <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button onClick={() => router.push("/search")}>
                Find More Properties
              </Button>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2 text-foreground">
                No bookings yet
              </h3>
              <p className="text-muted-foreground mb-4">
                You haven't made any bookings yet.
              </p>
              <Button onClick={() => router.push("/search")}>
                Browse Properties
              </Button>
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
                      <span className="text-sm font-medium">
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
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Host: {booking.property.host.full_name}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        router.push(`/messages?property=${booking.property.id}`)
                      }
                    >
                      View Conversation
                    </Button>
                    {booking.status === "approved" &&
                      !hasReviewed[booking.property.id] && (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            setSelectedBookingForReview(booking.property.id)
                          }
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Write a Review
                        </Button>
                      )}
                    {hasReviewed[booking.property.id] && (
                      <div className="w-full text-center text-sm text-muted-foreground">
                        You have already reviewed this property
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Review Form Dialog */}
          {selectedBookingForReview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg max-w-lg w-full mx-4">
                <h2 className="text-xl font-semibold mb-4">Write a Review</h2>
                <ReviewForm
                  propertyId={selectedBookingForReview}
                  onReviewSubmitted={handleReviewSubmitted}
                />
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => setSelectedBookingForReview(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
