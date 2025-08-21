export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          property_id: string;
          participant1_id: string;
          participant2_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          participant1_id: string;
          participant2_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          participant1_id?: string;
          participant2_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          metadata?: Json;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
          metadata?: Json;
        };
      };
      properties: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string;
          price: number;
          location: string;
          images: string[];
          amenities: string[];
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          description: string;
          price: number;
          location: string;
          images: string[];
          amenities: string[];
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          title?: string;
          description?: string;
          price?: number;
          location?: string;
          images?: string[];
          amenities?: string[];
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      virtual_tours: {
        Row: {
          id: string;
          conversation_id: string;
          property_id: string;
          host_id: string;
          scheduled_time: string;
          status:
            | "pending"
            | "approved"
            | "rejected"
            | "in_progress"
            | "completed"
            | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          property_id: string;
          host_id: string;
          scheduled_time: string;
          status:
            | "pending"
            | "approved"
            | "rejected"
            | "in_progress"
            | "completed"
            | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          property_id?: string;
          host_id?: string;
          scheduled_time?: string;
          status?:
            | "pending"
            | "approved"
            | "rejected"
            | "in_progress"
            | "completed"
            | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
