"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, MoreHorizontal, Plus, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface Listing {
  id: string;
  title: string;
  description: string;
  price_per_month: number;
  address: string;
  city: string;
  state: string;
  country: string;
  images: string[];
  is_available: boolean;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  created_at: string;
}

export default function ListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setLoading(false); // Ensure loading is reset
        router.push("/?redirect=/dashboard/listings");
        return;
      }
      setListings([]); // Reset listings on user change
      fetchListings();
    }
  }, [user, authLoading]);

  const fetchListings = async () => {
    if (!user?.id) {
      setLoading(false); // Ensure loading is reset
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      setListings([]); // Reset listings on error
      setLoading(false); // Ensure loading is reset
      console.error("Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to load listings.",
        variant: "destructive",
      });
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;

    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id)
        .eq("host_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing deleted successfully.",
      });

      fetchListings();
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      toast({
        title: "Error",
        description: "Failed to delete listing.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-muted-foreground">Manage your property listings</p>
        </div>
        <Button asChild>
          <Link href="/add-listing">
            <Plus className="h-4 w-4 mr-2" />
            Add New Listing
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You haven't listed any properties yet.
                </p>
                <Button asChild>
                  <Link href="/add-listing">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Listing
                  </Link>
                </Button>
              </div>
            ) : (
              listings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={listing.images[0] || "/placeholder.svg"}
                    alt={listing.title}
                    className="w-20 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {listing.address}, {listing.city}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(listing.price_per_month)}/month
                      </span>
                      <Badge
                        variant={listing.is_available ? "default" : "secondary"}
                      >
                        {listing.is_available ? "Available" : "Booked"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/edit-listing/${listing.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/listing/${listing.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(listing.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Listing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
