import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Testimonials } from "@/components/testimonials";
import { SimpleDebug } from "@/components/simple-debug";
import { supabase } from "@/lib/supabase/client";
import { Star } from "lucide-react";

interface DatabaseReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
  };
  property: {
    title: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
  };
  property: {
    title: string;
  };
}

async function getFeaturedReviews() {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      reviewer:reviewer_id (
        full_name,
        avatar_url
      ),
      property:property_id (
        title
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }

  return (reviews || []).map((review: any) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    reviewer: {
      full_name: review.reviewer.full_name,
      avatar_url: review.reviewer.avatar_url,
    },
    property: {
      title: review.property.title,
    },
  })) as Review[];
}

export default async function HomePage() {
  const featuredReviews = await getFeaturedReviews();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Hero />

      <Features />
      <HowItWorks />

      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              What Our Users Say
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Hear from our satisfied tenants about their experience with our
              properties
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mr-4">
                    {review.reviewer.avatar_url ? (
                      <img
                        src={review.reviewer.avatar_url}
                        alt={review.reviewer.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        {review.reviewer.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {review.reviewer.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {review.property.title}
                    </p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 italic">
                  "{review.comment}"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  {new Date(review.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
