export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          is_host?: boolean;
          is_verified?: boolean;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          is_host?: boolean;
        };
      };
      properties: {
        Row: {
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
        };
        Insert: {
          host_id: string;
          title: string;
          description?: string | null;
          property_type:
            | "private_room"
            | "shared_room"
            | "hostel_bed"
            | "studio"
            | "apartment";
          address: string;
          city: string;
          state?: string | null;
          country: string;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          price_per_month: number;
          bedrooms?: number;
          bathrooms?: number;
          area_sqft?: number | null;
          max_occupants?: number;
          is_furnished?: boolean;
          is_pet_friendly?: boolean;
          is_smoking_allowed?: boolean;
          is_available?: boolean;
          available_from?: string | null;
          minimum_stay_months?: number;
          images?: string[];
          amenities?: string[];
          house_rules?: string[];
        };
        Update: {
          title?: string;
          description?: string | null;
          property_type?:
            | "private_room"
            | "shared_room"
            | "hostel_bed"
            | "studio"
            | "apartment";
          address?: string;
          city?: string;
          state?: string | null;
          country?: string;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          price_per_month?: number;
          bedrooms?: number;
          bathrooms?: number;
          area_sqft?: number | null;
          max_occupants?: number;
          is_furnished?: boolean;
          is_pet_friendly?: boolean;
          is_smoking_allowed?: boolean;
          is_available?: boolean;
          available_from?: string | null;
          minimum_stay_months?: number;
          images?: string[];
          amenities?: string[];
          house_rules?: string[];
        };
      };
      reviews: {
        Row: {
          id: string;
          property_id: string;
          reviewer_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          property_id: string;
          reviewer_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          property_id: string;
          tenant_id: string;
          host_id: string;
          start_date: string;
          end_date: string | null;
          monthly_rent: number;
          total_amount: number | null;
          status: "pending" | "confirmed" | "cancelled" | "completed";
          special_requests: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          property_id: string;
          tenant_id: string;
          host_id: string;
          start_date: string;
          end_date?: string | null;
          monthly_rent: number;
          total_amount?: number | null;
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          special_requests?: string | null;
        };
        Update: {
          start_date?: string;
          end_date?: string | null;
          monthly_rent?: number;
          total_amount?: number | null;
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          special_requests?: string | null;
        };
      };
      inquiries: {
        Row: {
          id: string;
          property_id: string;
          sender_id: string;
          recipient_id: string;
          subject: string | null;
          message: string;
          status: "pending" | "responded" | "closed";
          created_at: string;
        };
        Insert: {
          property_id: string;
          sender_id: string;
          recipient_id: string;
          subject?: string | null;
          message: string;
          status?: "pending" | "responded" | "closed";
        };
        Update: {
          status?: "pending" | "responded" | "closed";
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          property_id: string;
        };
        Update: never;
      };
    };
  };
};
