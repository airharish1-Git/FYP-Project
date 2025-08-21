"use client";

import { useState, useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid, List, MapPin, Loader2 } from "lucide-react";
import { PropertyService } from "@/lib/services/property-service";
import { useToast } from "@/hooks/use-toast";

interface ListingGridProps {
  filters?: {
    city?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
  };
}

export function ListingGrid({ filters }: ListingGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const propertyService = new PropertyService();

  const loadProperties = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 0 : page;

      let sortOrder: any = { created_at: { ascending: false } };

      switch (sortBy) {
        case "price-low":
          sortOrder = { price_per_month: { ascending: true } };
          break;
        case "price-high":
          sortOrder = { price_per_month: { ascending: false } };
          break;
        case "rating":
          // We'll sort by rating in the frontend since it's calculated
          break;
        case "newest":
          sortOrder = { created_at: { ascending: false } };
          break;
      }

      const data = await propertyService.getProperties({
        ...filters,
        limit: 12,
        offset: currentPage * 12,
        isAvailable: true,
      });

      if (sortBy === "rating") {
        data.sort((a, b) => b.avgRating - a.avgRating);
      }

      if (reset) {
        setProperties(data);
        setPage(1);
      } else {
        setProperties((prev) => [...prev, ...data]);
        setPage((prev) => prev + 1);
      }

      setHasMore(data.length === 12);
    } catch (err: any) {
      console.error("Error loading properties:", err);
      setError(err.message || "Failed to load properties");
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties(true);
  }, [filters, sortBy]);

  if (loading && properties.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">Error loading properties: {error}</p>
          <Button onClick={() => loadProperties(true)} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Available Accommodations
          </h1>
          <p className="text-gray-600">{properties.length} results found</p>
        </div>

        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" />
            Map View
          </Button>
        </div>
      </div>

      {/* Listings Grid */}
      {properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No properties found matching your criteria.
          </p>
          <p className="text-gray-500 mt-2">
            Try adjusting your filters or search in a different area.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            }`}
          >
            {properties.map((property) => (
              <ListingCard
                key={property.id}
                listing={property}
                viewMode={viewMode}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                onClick={() => loadProperties(false)}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More Results
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
