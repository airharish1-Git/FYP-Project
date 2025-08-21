"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  MapPin,
  Heart,
  Video,
  MessageCircle,
  Phone,
  Calendar,
  Bed,
  Bath,
  Home,
  Shield,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PropertyService } from "@/lib/services/property-service";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { VirtualTourDialog } from "@/components/virtual-tour-dialog";
import { ReviewForm } from "@/components/review-form";
import { AuthGuard } from "@/components/auth/auth-guard";

interface Review {
  id: string;
  property_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  is_host: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  property_type:
    | "private_room"
    | "shared_room"
    | "hostel_bed"
    | "studio"
    | "apartment";
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_month: number;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  max_occupants: number;
  is_furnished: boolean;
  is_pet_friendly: boolean;
  is_smoking_allowed: boolean;
  is_available: boolean;
  available_from: string | null;
  minimum_stay_months: number;
  images: string[];
  amenities: string[];
  house_rules: string[];
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  reviews?: Review[];
  avgRating?: number;
  reviewCount?: number;
  is_favorite?: boolean;
  status?: string;
}

interface Conversation {
  id: string;
  property_id: string;
  participant1_id: string;
  participant2_id: string;
  updated_at: string;
  last_message: {
    content: string;
    created_at: string;
  };
  participant1: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  participant2: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  participants?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

interface ListingDetailProps {
  listingId: string;
}

export function ListingDetail({ listingId }: ListingDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [isVirtualTourDialogOpen, setIsVirtualTourDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Helper to determine sold status
  const isSold = listing?.status === "sold" || !listing?.is_available;

  const fetchListing = async () => {
    try {
      const propertyService = new PropertyService();
      const data = await propertyService.getPropertyById(listingId);
      setListing(data);
      setIsLiked(!!data?.is_favorite);
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast({
        title: "Error",
        description: "Failed to load listing details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
      if (user?.id === listing?.host_id) {
        fetchConversations();
      }
    }
  }, [listingId, user]);

  // Add timeout for loading state
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!user || !listing) return;

      try {
        // Check if user has purchased this property
        const { data: booking } = await supabase
          .from("bookings")
          .select("id")
          .eq("property_id", listingId)
          .eq("tenant_id", user.id)
          .eq("status", "completed")
          .single();

        if (booking) {
          // Check if user has already reviewed
          const { data: existingReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("property_id", listingId)
            .eq("reviewer_id", user.id)
            .single();

          setCanReview(!!booking && !existingReview);
          setHasReviewed(!!existingReview);
        }
      } catch (error) {
        console.error("Error checking review eligibility:", error);
      }
    };

    checkReviewEligibility();
  }, [user, listing, listingId]);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url),
          participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url),
          last_message:messages(content, created_at)
        `
        )
        .eq("property_id", listingId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const transformedData =
        data?.map((conv) => ({
          ...conv,
          participants: [conv.participant1, conv.participant2].filter(
            Boolean
          ) as {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
          }[],
        })) || [];

      setConversations(transformedData);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleMessageHost = async () => {
    if (!user) {
      // This will be handled by the AuthGuard wrapper
      return;
    }

    if (!listing || !listing.profiles) {
      toast({
        title: "Error",
        description: "Listing information not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if a conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .eq("property_id", listing.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingConversation) {
        // If conversation exists, redirect to it
        router.push(`/messages?conversation=${existingConversation.id}`);
        return;
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          property_id: listing.id,
          participant1_id: user.id,
          participant2_id: listing.host_id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Redirect to the new conversation
      router.push(`/messages?conversation=${newConversation.id}`);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleVirtualTour = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to schedule a virtual tour",
        variant: "destructive",
      });
      return;
    }

    if (!listing) {
      toast({
        title: "Error",
        description: "Listing information is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if a conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${listing.host_id}),and(participant1_id.eq.${listing.host_id},participant2_id.eq.${user.id})`
        )
        .eq("property_id", listing.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from("conversations")
          .insert({
            property_id: listing.id,
            participant1_id: user.id,
            participant2_id: listing.host_id,
          })
          .select()
          .single();

        if (createError) throw createError;
        conversationId = newConversation.id;
      }

      // Open virtual tour dialog with conversation ID
      setIsVirtualTourDialogOpen(true);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">
            {loadingTimeout
              ? "Taking longer than expected..."
              : "Loading listing details..."}
          </p>
          <p className="text-sm text-muted-foreground">
            If this takes too long, try refreshing the page
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Listing Not Found
          </h2>
          <p className="text-muted-foreground">
            The listing you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Image Gallery */}
          <div className="mb-8">
            <div className="relative">
              <img
                src={listing.images[currentImageIndex] || "/placeholder.svg"}
                alt={listing.title}
                className="w-full h-96 object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4">
                <Badge
                  variant={
                    isSold
                      ? "destructive"
                      : listing?.is_available
                      ? "default"
                      : "secondary"
                  }
                  className="bg-background/90 backdrop-blur-sm text-foreground border border-border"
                >
                  {isSold
                    ? "Sold"
                    : listing?.is_available
                    ? "Available Now"
                    : "Booked"}
                </Badge>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleScheduleVirtualTour}
                  className="bg-background/90 backdrop-blur-sm text-foreground border border-border hover:bg-background/95"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Virtual Tour
                </Button>
              </div>
            </div>

            {/* Image Thumbnails */}
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {listing.images.map((image, index) => (
                <img
                  key={index}
                  src={image || "/placeholder.svg"}
                  alt={`${listing.title} ${index + 1}`}
                  className={`w-20 h-20 object-cover rounded cursor-pointer transition-all ${
                    currentImageIndex === index
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* Title and Basic Info */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {listing.title}
                </h1>
                <div className="flex items-center text-muted-foreground mb-2">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>
                    {listing.address}, {listing.city}, {listing.state},{" "}
                    {listing.country}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                    <span className="font-medium text-foreground">
                      {listing.avgRating}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({listing.reviewCount} reviews)
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border text-foreground"
                  >
                    {listing.property_type}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-foreground">
                  {formatPrice(listing.price_per_month)}
                  <span className="text-lg font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList
              className={`grid w-full ${
                (listing?.reviews && listing.reviews.length > 0) ||
                canReview ||
                hasReviewed
                  ? "grid-cols-3"
                  : "grid-cols-2"
              }`}
            >
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              {((listing?.reviews && listing.reviews.length > 0) ||
                canReview ||
                hasReviewed) && (
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Description
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {listing?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    House Rules
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {listing?.house_rules?.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-foreground">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="amenities" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">
                    Available Amenities
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {listing?.amenities?.map((amenity, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 rounded-lg border border-border p-3 bg-card hover:bg-muted/50 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-foreground">
                          {amenity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {listing?.bedrooms}{" "}
                        {listing?.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {listing?.bathrooms}{" "}
                        {listing?.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Up to {listing?.max_occupants}{" "}
                        {listing?.max_occupants === 1 ? "person" : "people"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {listing?.reviews && listing.reviews.length > 0 && (
              <TabsContent value="reviews" className="space-y-4">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      Reviews ({listing.reviewCount})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Reviews
                      </h3>
                      {/* Review Form for eligible buyers */}
                      {canReview && (
                        <div className="mb-8 p-6 bg-card rounded-lg border border-border">
                          <h3 className="text-lg font-semibold mb-4 text-foreground">
                            Write a Review
                          </h3>
                          <ReviewForm
                            propertyId={listingId}
                            onReviewSubmitted={() => {
                              setCanReview(false);
                              setHasReviewed(true);
                              // Refresh the listing data to show the new review
                              fetchListing();
                            }}
                          />
                        </div>
                      )}

                      {/* Message for users who have already reviewed */}
                      {hasReviewed && (
                        <div className="mb-8 p-4 bg-muted rounded-lg border border-border">
                          <p className="text-muted-foreground">
                            You have already submitted a review for this
                            property.
                          </p>
                        </div>
                      )}

                      {/* Existing Reviews */}
                      <div className="space-y-6">
                        {listing.reviews.map((review) => (
                          <div
                            key={review.id}
                            className="p-6 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  review.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-foreground leading-relaxed">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Review form for properties without reviews */}
            {(!listing?.reviews || listing.reviews.length === 0) &&
              (canReview || hasReviewed) && (
                <TabsContent value="reviews" className="space-y-4">
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          Be the first to review!
                        </h3>

                        {/* Review Form for eligible buyers */}
                        {canReview && (
                          <div className="p-6 bg-card rounded-lg border border-border">
                            <h3 className="text-lg font-semibold mb-4 text-foreground">
                              Write a Review
                            </h3>
                            <ReviewForm
                              propertyId={listingId}
                              onReviewSubmitted={() => {
                                setCanReview(false);
                                setHasReviewed(true);
                                // Refresh the listing data to show the new review
                                fetchListing();
                              }}
                            />
                          </div>
                        )}

                        {/* Message for users who have already reviewed */}
                        {hasReviewed && (
                          <div className="p-4 bg-muted rounded-lg border border-border">
                            <p className="text-muted-foreground">
                              You have already submitted a review for this
                              property.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
          </Tabs>

          {/* Action Buttons */}
          {isSold && (
            <div className="mt-8 flex gap-4">
              <AuthGuard>
                <Button onClick={handleMessageHost} className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Host
                </Button>
              </AuthGuard>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {/* Booking Widget */}
          {!isSold && (
            <Card className="sticky top-24 mb-6 bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Book this place
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <AuthGuard>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleMessageHost}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Host
                    </Button>
                  </AuthGuard>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Your information is protected
                </div>
              </CardContent>
            </Card>
          )}

          {/* Host Information */}
          {listing.profiles && (
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Meet your host
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Host Information
                  </h3>
                  <div className="flex items-center gap-4">
                    <Avatar className="ring-2 ring-border">
                      <AvatarImage
                        src={listing.profiles.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {listing.profiles.full_name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {listing.profiles.full_name || "Anonymous Host"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Member since{" "}
                        {listing.profiles.created_at &&
                        !isNaN(new Date(listing.profiles.created_at).getTime())
                          ? formatDistanceToNow(
                              new Date(listing.profiles.created_at),
                              {
                                addSuffix: true,
                              }
                            )
                          : "Recently"}
                      </p>
                    </div>
                  </div>
                </div>

                {listing.profiles.bio && (
                  <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                    {listing.profiles.bio}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {user?.id === listing?.host_id && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                Active Conversations
              </h2>
              {loadingConversations ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No active conversations for this listing.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {conversations.map((conversation) => {
                    const otherParticipant = conversation.participants?.find(
                      (p) => p?.id !== user?.id
                    );

                    if (!otherParticipant) return null;

                    return (
                      <Link
                        key={conversation.id}
                        href={`/messages?conversation=${conversation.id}`}
                        className="block"
                      >
                        <Card className="hover:bg-muted/50 transition-colors border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="ring-2 ring-border">
                                <AvatarImage
                                  src={otherParticipant.avatar_url || undefined}
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {otherParticipant.full_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate text-foreground">
                                    {otherParticipant.full_name ||
                                      "Anonymous User"}
                                  </p>
                                  {conversation.last_message && (
                                    <p className="text-sm text-muted-foreground">
                                      {conversation.last_message.created_at &&
                                      !isNaN(
                                        new Date(
                                          conversation.last_message.created_at
                                        ).getTime()
                                      )
                                        ? formatDistanceToNow(
                                            new Date(
                                              conversation.last_message.created_at
                                            ),
                                            { addSuffix: true }
                                          )
                                        : "Recently"}
                                    </p>
                                  )}
                                </div>
                                {conversation.last_message && (
                                  <p className="text-sm text-muted-foreground truncate mt-1">
                                    {conversation.last_message.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <VirtualTourDialog
        isOpen={isVirtualTourDialogOpen}
        onClose={() => setIsVirtualTourDialogOpen(false)}
        conversationId={conversations[0]?.id || ""}
        propertyId={listingId}
        hostId={listing?.host_id || ""}
        isHost={user?.id === listing?.host_id}
      />
    </div>
  );
}
