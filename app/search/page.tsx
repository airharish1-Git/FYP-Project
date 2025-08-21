"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { ListingCard } from "@/components/listing-card";
import { Search, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Listing {
  id: string;
  title: string;
  description: string;
  price_per_month: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  property_type: string;
  images: string[];
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });
  const [filters, setFilters] = useState<{
    priceRange: [number, number];
    propertyType:
      | "apartment"
      | "hostel_bed"
      | "private_room"
      | "shared_room"
      | "studio"
      | undefined;
    subType: number | null;
  }>({
    priceRange: [0, 2000],
    propertyType: undefined,
    subType: null,
  });

  // Add clearFilters function
  const clearFilters = () => {
    setFilters({
      priceRange: [priceRange.min, priceRange.max] as [number, number],
      propertyType: undefined,
      subType: null,
    });
  };

  // Initialize filters from URL params only once
  useEffect(() => {
    const initialFilters = {
      priceRange: [0, 2000] as [number, number],
      propertyType: undefined as
        | "apartment"
        | "hostel_bed"
        | "private_room"
        | "shared_room"
        | "studio"
        | undefined,
      subType: null as number | null,
    };

    if (searchParams.get("minPrice")) {
      initialFilters.priceRange[0] = Number(searchParams.get("minPrice"));
    }
    if (searchParams.get("maxPrice")) {
      initialFilters.priceRange[1] = Number(searchParams.get("maxPrice"));
    }
    if (searchParams.get("type")) {
      initialFilters.propertyType = searchParams.get("type") as
        | "apartment"
        | "hostel_bed"
        | "private_room"
        | "shared_room"
        | "studio";
    }
    if (searchParams.get("subType")) {
      initialFilters.subType = Number(searchParams.get("subType"));
    }

    setFilters({
      priceRange: initialFilters.priceRange,
      propertyType: initialFilters.propertyType,
      subType: initialFilters.subType,
    });
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    fetchPriceRange();
  }, []); // Fetch price range only once on mount

  useEffect(() => {
    fetchListings();
  }, [filters]); // Fetch listings when filters change

  const fetchPriceRange = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("price_per_month")
        .eq("is_available", true);

      if (error) throw error;

      if (data && data.length > 0) {
        const prices = data.map((p) => p.price_per_month);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        setPriceRange({ min, max });
        // Update filters with the new price range
        setFilters((prev) => ({
          ...prev,
          priceRange: [min, max] as [number, number],
        }));
      }
    } catch (error) {
      console.error("Error fetching price range:", error);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("properties")
        .select("*, user:profiles(full_name, avatar_url)")
        .eq("is_available", true);

      // Apply price range
      if (filters.priceRange[0] > priceRange.min) {
        query = query.gte("price_per_month", filters.priceRange[0]);
      }
      if (filters.priceRange[1] < priceRange.max) {
        query = query.lte("price_per_month", filters.priceRange[1]);
      }

      // Apply property type
      if (filters.propertyType) {
        query = query.eq("property_type", filters.propertyType);
      }

      // Apply subType (BHK or seater)
      if (filters.propertyType === "apartment" && filters.subType) {
        query = query.eq("bedrooms", filters.subType);
      }
      if (filters.propertyType === "hostel_bed" && filters.subType) {
        query = query.eq("max_occupants", filters.subType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Only update URL when explicitly searching
    const params = new URLSearchParams();
    if (filters.priceRange[0] > priceRange.min)
      params.set("minPrice", filters.priceRange[0].toString());
    if (filters.priceRange[1] < priceRange.max)
      params.set("maxPrice", filters.priceRange[1].toString());
    if (filters.propertyType) params.set("type", filters.propertyType);
    if (filters.subType) params.set("subType", filters.subType.toString());

    router.push(`/search?${params.toString()}`);
  };

  // Add a debounced search function
  const debouncedSearch = (value: string) => {
    // This function is no longer needed as search is handled by URL params
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Find Properties
          </h1>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full md:w-64 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="text-sm"
                    >
                      Clear All
                    </Button>
                  </div>

                  {/* Price Range Filter */}
                  <div className="space-y-2">
                    <Label>Price Range (NPR)</Label>
                    <Slider
                      value={filters.priceRange}
                      min={priceRange.min}
                      max={priceRange.max}
                      step={100}
                      onValueChange={(value) => {
                        setFilters((prev) => ({
                          ...prev,
                          priceRange: value as [number, number],
                        }));
                      }}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>NPR {filters.priceRange[0]}</span>
                      <span>NPR {filters.priceRange[1]}</span>
                    </div>
                  </div>

                  {/* Property Type Filter */}
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={
                          filters.propertyType === "apartment"
                            ? "default"
                            : "outline"
                        }
                        className="w-full"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            propertyType: "apartment",
                            subType: null,
                          }))
                        }
                      >
                        Apartment
                      </Button>
                      <Button
                        variant={
                          filters.propertyType === "hostel_bed"
                            ? "default"
                            : "outline"
                        }
                        className="w-full"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            propertyType: "hostel_bed",
                            subType: null,
                          }))
                        }
                      >
                        Hostel
                      </Button>
                    </div>
                  </div>

                  {/* Sub-filters for Apartment */}
                  {filters.propertyType === "apartment" && (
                    <div className="space-y-2">
                      <Label>BHK Type</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4].map((bhk) => (
                          <Button
                            key={bhk}
                            variant={
                              filters.subType === bhk ? "default" : "outline"
                            }
                            className="w-20"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, subType: bhk }))
                            }
                          >
                            {bhk} BHK
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-filters for Hostel */}
                  {filters.propertyType === "hostel_bed" && (
                    <div className="space-y-2">
                      <Label>Seater Type</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4].map((seater) => (
                          <Button
                            key={seater}
                            variant={
                              filters.subType === seater ? "default" : "outline"
                            }
                            className="w-20"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                subType: seater,
                              }))
                            }
                          >
                            {seater} Seater
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Listings Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by location, property type, or amenities..."
                  className="pl-10"
                  value={searchParams.get("q") || ""} // Display search query from URL
                  onChange={(e) => {
                    // This input is now for search query, not debounced
                    // The search is handled by URL params
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <CardContent className="p-4 space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold">No listings found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={{
                      ...listing,
                      address: (listing as any).address || "",
                      city:
                        (listing as any).location ||
                        (listing as any).city ||
                        "",
                      state: (listing as any).state || "",
                      country: (listing as any).country || "",
                      bathrooms: listing.bathrooms || 1,
                      bedrooms: listing.bedrooms || 1,
                      max_occupants: listing.max_occupants || 1,
                      property_type: (listing.property_type || "apartment") as
                        | "apartment"
                        | "hostel_bed"
                        | "private_room"
                        | "shared_room"
                        | "studio",
                      price_per_month: listing.price_per_month,
                      images: listing.images || [],
                      is_furnished: (listing as any).is_furnished || false,
                      is_pet_friendly:
                        (listing as any).is_pet_friendly || false,
                      is_smoking_allowed:
                        (listing as any).is_smoking_allowed || false,
                      is_available: (listing as any).is_available || true,
                      status: (listing as any).status || "available",
                      created_at: listing.created_at,
                      updated_at:
                        (listing as any).updated_at || listing.created_at,
                    }}
                    viewMode="grid"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
