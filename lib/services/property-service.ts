import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Property = Database["public"]["Tables"]["properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Review = Database["public"]["Tables"]["reviews"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

interface PropertyWithRating extends Property {
  avgRating: number;
  reviewCount: number;
  is_favorite?: boolean;
  profiles?: Profile;
  reviews?: Review[];
  bookings?: Booking[];
  activeBookings?: number;
}

interface PropertyFilters {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
  moveInDate?: string;
  furnished?: boolean;
  parking?: boolean;
  petsAllowed?: boolean;
  bedrooms?: number[];
}

export class PropertyService {
  async getProperties(filters: PropertyFilters = {}) {
    try {
      let query = supabase.from("properties").select(`
          *,
          profiles:host_id (
            full_name,
            avatar_url
          ),
          reviews (
            rating
          )
        `);

      // Apply filters
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.propertyType) {
        query = query.eq("property_type", filters.propertyType);
      }
      if (filters.minPrice) {
        query = query.gte("price_per_month", filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte("price_per_month", filters.maxPrice);
      }
      if (filters.isAvailable !== undefined) {
        query = query.eq("is_available", filters.isAvailable);
      }
      if (filters.furnished) {
        query = query.eq("is_furnished", true);
      }
      if (filters.parking) {
        // Add "Parking" to amenities array if not already present
        const amenities = filters.amenities || [];
        if (!amenities.includes("Parking")) {
          amenities.push("Parking");
        }
        filters.amenities = amenities;
      }
      if (filters.petsAllowed) {
        query = query.eq("is_pet_friendly", true);
      }
      if (filters.bedrooms && filters.bedrooms.length > 0) {
        query = query.in("bedrooms", filters.bedrooms);
      }
      if (filters.amenities && filters.amenities.length > 0) {
        query = query.contains("amenities", filters.amenities);
      }
      if (filters.moveInDate) {
        query = query.lte("available_from", filters.moveInDate);
      }

      // Add pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }

      if (!data) {
        return [];
      }

      // Calculate average rating for each property
      const propertiesWithRating = (data as PropertyWithRating[]).map(
        (property: PropertyWithRating) => {
          const ratings =
            property.reviews?.map((review: Review) => review.rating) || [];
          const avgRating =
            ratings.length > 0
              ? ratings.reduce((sum: number, rating: number) => sum + rating, 0)
              : 0;
          return {
            ...property,
            avgRating: ratings.length > 0 ? avgRating / ratings.length : 0,
            reviewCount: ratings.length,
          };
        }
      );

      return propertiesWithRating;
    } catch (error) {
      console.error("Error in getProperties:", error);
      throw error;
    }
  }

  async getPropertyById(id: string): Promise<PropertyWithRating | null> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          *,
          profiles:host_id (
            full_name,
            avatar_url,
            phone
          ),
          reviews (
            id,
            rating,
            comment,
            created_at,
            profiles (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching property:", error);
        throw error;
      }

      if (!data) {
        return null;
      }

      const property = data as PropertyWithRating;
      const ratings =
        property.reviews?.map((review: Review) => review.rating) || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) /
            ratings.length
          : 0;

      return {
        ...property,
        avgRating,
        reviewCount: ratings.length,
      };
    } catch (error) {
      console.error("Error in getPropertyById:", error);
      throw error;
    }
  }

  async createProperty(propertyData: PropertyInsert) {
    try {
      const { data, error } = await supabase
        .from("properties")
        .insert([propertyData])
        .select()
        .single();

      if (error) {
        console.error("Error creating property:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in createProperty:", error);
      throw error;
    }
  }

  async updateProperty(id: string, propertyData: PropertyUpdate) {
    try {
      const { data, error } = await supabase
        .from("properties")
        .update(propertyData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating property:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in updateProperty:", error);
      throw error;
    }
  }

  async deleteProperty(id: string) {
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);

      if (error) {
        console.error("Error deleting property:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteProperty:", error);
      throw error;
    }
  }

  async getPropertiesByHost(hostId: string): Promise<PropertyWithRating[]> {
    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        *,
        reviews (rating),
        bookings (status)
      `
      )
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((property: PropertyWithRating) => {
      const ratings =
        property.reviews?.map((review: Review) => review.rating) || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) /
            ratings.length
          : 0;

      const bookings = property.bookings || [];
      const activeBookings = bookings.filter(
        (booking: Booking) => booking.status === "confirmed"
      ).length;

      return {
        ...property,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: ratings.length,
        activeBookings,
      };
    });
  }

  async toggleFavorite(userId: string, propertyId: string) {
    // Check if already favorited
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .single();

    if (existing) {
      // Remove from favorites
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) throw error;
      return false;
    } else {
      // Add to favorites
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, property_id: propertyId });

      if (error) throw error;
      return true;
    }
  }

  async getUserFavorites(userId: string): Promise<PropertyWithRating[]> {
    const { data, error } = await supabase
      .from("favorites")
      .select(
        `
        property_id,
        property:properties!favorites_property_id_fkey (
          *,
          reviews (rating)
        )
      `
      )
      .eq("user_id", userId);

    if (error) throw error;

    return (data || []).map(
      (favorite: { property_id: string; property: PropertyWithRating }) => {
        const property = favorite.property;
        const ratings =
          property.reviews?.map((review: Review) => review.rating) || [];
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) /
              ratings.length
            : 0;

        return {
          ...property,
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount: ratings.length,
          is_favorite: true,
        };
      }
    );
  }

  async addFavorite(propertyId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("favorites")
        .insert([{ user_id: user.id, property_id: propertyId }]);

      if (error) {
        console.error("Error adding favorite:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in addFavorite:", error);
      throw error;
    }
  }

  async removeFavorite(propertyId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Error removing favorite:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in removeFavorite:", error);
      throw error;
    }
  }

  async getFavorites() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          property_id,
          properties (
            *,
            profiles:host_id (
              full_name,
              avatar_url
            ),
            reviews (
              rating
            )
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching favorites:", error);
        throw error;
      }

      if (!data) {
        return [];
      }

      // Transform the data to match the property format
      return (
        data as { property_id: string; properties: PropertyWithRating }[]
      ).map((favorite) => {
        const property = favorite.properties;
        const ratings =
          property.reviews?.map((review: Review) => review.rating) || [];
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((sum: number, rating: number) => sum + rating, 0)
            : 0;
        return {
          ...property,
          avgRating: ratings.length > 0 ? avgRating / ratings.length : 0,
          reviewCount: ratings.length,
          is_favorite: true,
        };
      });
    } catch (error) {
      console.error("Error in getFavorites:", error);
      throw error;
    }
  }
}
