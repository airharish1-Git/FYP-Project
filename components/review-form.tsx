"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Star } from "lucide-react";

interface ReviewFormProps {
  propertyId: string;
  onReviewSubmitted: () => void;
}

export function ReviewForm({ propertyId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }

      // Check if user has purchased this property
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("property_id", propertyId)
        .eq("tenant_id", user.id)
        .eq("status", "approved")
        .single();

      if (bookingError) {
        console.error("Error checking booking:", bookingError);
        throw new Error("You can only review properties you have purchased");
      }

      if (!booking) {
        throw new Error("You can only review properties you have purchased");
      }

      // Check if user has already reviewed this property
      const { data: existingReview, error: reviewError } = await supabase
        .from("reviews")
        .select("id")
        .eq("property_id", propertyId)
        .eq("reviewer_id", user.id)
        .single();

      if (reviewError && reviewError.code !== "PGRST116") {
        // PGRST116 is the "no rows returned" error
        console.error("Error checking existing review:", reviewError);
        throw new Error("Error checking existing review");
      }

      if (existingReview) {
        throw new Error("You have already reviewed this property");
      }

      // Submit the review
      const { error: insertError } = await supabase.from("reviews").insert({
        property_id: propertyId,
        reviewer_id: user.id,
        rating,
        comment,
      });

      if (insertError) {
        console.error("Error inserting review:", insertError);
        throw new Error("Failed to submit review");
      }

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      setRating(0);
      setComment("");
      onReviewSubmitted();
    } catch (error: any) {
      console.error("Review submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-sm transition-colors hover:scale-110"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  value <= rating
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground hover:text-yellow-400"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="comment"
          className="text-sm font-medium text-foreground"
        >
          Your Review
        </label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this property..."
          className="min-h-[100px] bg-background text-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent"
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
