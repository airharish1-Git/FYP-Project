"use client";

import { useState, useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Heart, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PropertyService } from "@/lib/services/property-service";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const propertyService = new PropertyService();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const userFavorites = await propertyService.getUserFavorites(user.id);
          setFavorites(userFavorites || []);
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      }
      setLoading(false);
    };

    getUser();
  }, []);

  const favoritesContent = (
    <div className="min-h-screen bg-background">
      <div className="pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                My Favorites
              </h1>
              <p className="text-muted-foreground">
                Properties you've saved for later
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No favorites yet
              </h2>
              <p className="text-muted-foreground mb-8">
                Start exploring and save properties you're interested in.
              </p>
              <Link href="/search">
                <Button>
                  <Search className="h-4 w-4 mr-2" />
                  Browse Properties
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((property) => (
                <ListingCard
                  key={property.id}
                  listing={property}
                  viewMode="grid"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AuthGuard
      fallback={
        <div className="min-h-screen bg-background">
          <div className="pt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Sign in to view your favorites
              </h1>
              <p className="text-muted-foreground mb-8">
                Save properties you're interested in and access them here.
              </p>
              <Link href="/">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      }
    >
      {favoritesContent}
    </AuthGuard>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="animate-pulse text-muted-foreground">
              Loading your favorites...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard
      fallback={
        <div className="min-h-screen bg-background">
          <div className="pt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Sign in to view your favorites
              </h1>
              <p className="text-muted-foreground mb-8">
                Save properties you're interested in and access them here.
              </p>
              <Link href="/">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      }
    >
      {favoritesContent}
    </AuthGuard>
  );
}
