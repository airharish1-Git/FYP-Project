"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { AddListingForm } from "@/components/add-listing-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EditListingFormProps {
  listingId: string;
}

export function EditListingForm({ listingId }: EditListingFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/?redirect=/edit-listing/" + listingId);
        return;
      }
      fetchListing();
    }
  }, [user, authLoading, listingId]);

  const fetchListing = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", listingId)
        .eq("host_id", user.id)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Listing not found.",
          variant: "destructive",
        });
        router.push("/dashboard/listings");
        return;
      }

      setListing(data);
    } catch (error: any) {
      console.error("Error fetching listing:", error);
      toast({
        title: "Error",
        description: "Failed to load listing.",
        variant: "destructive",
      });
      router.push("/dashboard/listings");
    } finally {
      setLoading(false);
    }
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

  if (!listing) {
    return null; // Will redirect in fetchListing
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Edit Listing</h1>
              <p className="text-muted-foreground">
                Update your property listing details
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/listings")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <AddListingForm
              initialData={listing}
              mode="edit"
              onSuccess={() => {
                toast({
                  title: "Success",
                  description: "Listing updated successfully.",
                });
                router.push("/dashboard/listings");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
