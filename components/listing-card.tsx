"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Bed, Bath, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import { useFavorites } from "@/lib/context/favorites-context";
import { AuthGuard } from "@/components/auth/auth-guard";

interface Listing {
  id: string;
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
  price_per_month: number;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  images: string[];
  is_furnished: boolean;
  is_pet_friendly: boolean;
  is_smoking_allowed: boolean;
  is_available: boolean;
  status: "available" | "sold" | "pending";
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

interface ListingCardProps {
  listing: Listing;
  viewMode?: "grid" | "list";
}

export function ListingCard({ listing, viewMode = "grid" }: ListingCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshFavorites } = useFavorites();
  const [isFavorite, setIsFavorite] = useState(listing.is_favorite || false);
  const [isLoading, setIsLoading] = useState(false);

  // Check favorite status when component mounts or user changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user) return;

      try {
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("property_id", listing.id)
          .maybeSingle();

        setIsFavorite(!!existing);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    checkFavoriteStatus();
  }, [user, listing.id]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // This will be handled by the AuthGuard wrapper
      return;
    }

    try {
      setIsLoading(true);
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", listing.id);

        if (error) throw error;
        setIsFavorite(false);
        await refreshFavorites();
        toast({
          title: "Removed from Favorites",
          description: "Property has been removed from your favorites.",
        });
      } else {
        // Check if already favorited
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("property_id", listing.id)
          .maybeSingle();
        if (existing) {
          // Remove from favorites
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("property_id", listing.id);
          if (error) throw error;
          setIsFavorite(false);
          await refreshFavorites();
          toast({
            title: "Removed from Favorites",
            description: "Property has been removed from your favorites.",
          });
        } else {
          // Add to favorites
          const { error } = await supabase.from("favorites").insert({
            user_id: user.id,
            property_id: listing.id,
          });
          if (error) throw error;
          setIsFavorite(true);
          await refreshFavorites();
          toast({
            title: "Added to Favorites",
            description: "Property has been added to your favorites.",
          });
        }
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const propertyTypeLabels: Record<Listing["property_type"], string> = {
    private_room: "Private Room",
    shared_room: "Shared Room",
    hostel_bed: "Hostel Bed",
    studio: "Studio",
    apartment: "Apartment",
  };

  if (viewMode === "list") {
    return (
      <div className="flex gap-4 p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
        <div className="relative w-48 h-32 flex-shrink-0">
          <Image
            src={listing.images[0] || "/placeholder.svg"}
            alt={listing.title}
            fill
            className="object-cover rounded-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate text-foreground">
                {listing.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {listing.address}, {listing.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-foreground">
                {formatPrice(listing.price_per_month)}
              </p>
              <AuthGuard>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavorite}
                  disabled={isLoading}
                  className="hover:bg-muted/50"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
              </AuthGuard>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{listing.bedrooms} beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{listing.bathrooms} baths</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Max {listing.max_occupants} people</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                listing.status === "sold"
                  ? "destructive"
                  : listing.status === "pending"
                  ? "secondary"
                  : "default"
              }
              className="border-border"
            >
              {listing.status === "sold"
                ? "Sold"
                : listing.status === "pending"
                ? "Pending"
                : "Available"}
            </Badge>
            {listing.is_furnished && (
              <Badge variant="secondary" className="border-border">
                Furnished
              </Badge>
            )}
            {listing.is_pet_friendly && (
              <Badge variant="secondary" className="border-border">
                Pet Friendly
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-between items-end">
          <Link href={`/listing/${listing.id}`}>
            <Button>View Details</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3]">
          <Image
            src={listing.images[0] || "/placeholder.svg"}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-2 right-2">
            <AuthGuard>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/90 backdrop-blur-sm hover:bg-background/95 border border-border"
                onClick={handleFavorite}
                disabled={isLoading}
              >
                <Heart
                  className={`h-5 w-5 ${
                    isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
                  }`}
                />
              </Button>
            </AuthGuard>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-lg font-semibold text-white truncate">
              {listing.title}
            </p>
            <p className="text-sm text-white/90 truncate">
              {listing.address}, {listing.city}
            </p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-semibold text-foreground">
              {formatPrice(listing.price_per_month)}
            </p>
            <Badge
              variant={
                listing.status === "sold"
                  ? "destructive"
                  : listing.status === "pending"
                  ? "secondary"
                  : "default"
              }
              className="border-border"
            >
              {listing.status === "sold"
                ? "Sold"
                : listing.status === "pending"
                ? "Pending"
                : "Available"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{listing.bedrooms} beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{listing.bathrooms} baths</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Max {listing.max_occupants}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                listing.status === "sold"
                  ? "destructive"
                  : listing.status === "pending"
                  ? "secondary"
                  : "default"
              }
              className="border-border"
            >
              {listing.status === "sold"
                ? "Sold"
                : listing.status === "pending"
                ? "Pending"
                : "Available"}
            </Badge>
            {listing.is_furnished && (
              <Badge variant="secondary" className="border-border">
                Furnished
              </Badge>
            )}
            {listing.is_pet_friendly && (
              <Badge variant="secondary" className="border-border">
                Pet Friendly
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
