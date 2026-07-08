export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      agreements: {
        Row: {
          admin_notes: string | null
          approval_status: string
          created_at: string
          document_url: string | null
          id: string
          property_id: number
          signature_type: string | null
          signature_url: string | null
          signed_document_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string
          created_at?: string
          document_url?: string | null
          id?: string
          property_id: number
          signature_type?: string | null
          signature_url?: string | null
          signed_document_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string
          created_at?: string
          document_url?: string | null
          id?: string
          property_id?: number
          signature_type?: string | null
          signature_url?: string | null
          signed_document_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          currency: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guests: number
          id: string
          nightly_price: number
          nights: number
          notes: string | null
          payment_status: string
          property_id: number
          room_id: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          currency?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guests?: number
          id?: string
          nightly_price: number
          nights: number
          notes?: string | null
          payment_status?: string
          property_id: number
          room_id: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          currency?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guests?: number
          id?: string
          nightly_price?: number
          nights?: number
          notes?: string | null
          payment_status?: string
          property_id?: number
          room_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_responses: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          message: string
          responder_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          message: string
          responder_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          message?: string
          responder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_responses_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_properties: {
        Row: {
          created_at: string
          id: string
          property_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: number
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          property_id: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          property_id?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          property_id?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          balance: number
          created_at: string
          id: string
          invoice_pdf_url: string | null
          property_id: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          balance: number
          created_at?: string
          id?: string
          invoice_pdf_url?: string | null
          property_id: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          created_at?: string
          id?: string
          invoice_pdf_url?: string | null
          property_id?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_date: string
          property_id: number
          receipt_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_date?: string
          property_id: number
          receipt_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          property_id?: number
          receipt_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          suspended?: boolean
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          suspended?: boolean
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          area: string | null
          baths: number
          beds: number
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          description: string | null
          featured: boolean
          gps_lat: number | null
          gps_lng: number | null
          id: number
          image_url: string | null
          images: string[] | null
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          location: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          parking: number | null
          price: string
          price_value: number
          region: string | null
          slug: string | null
          sqft: string | null
          status: string
          title: string
          type: string
          units: number
          updated_at: string
          video_url: string | null
          year_built: number | null
        }
        Insert: {
          amenities?: string[] | null
          area?: string | null
          baths?: number
          beds?: number
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          gps_lat?: number | null
          gps_lng?: number | null
          id?: number
          image_url?: string | null
          images?: string[] | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          location: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking?: number | null
          price: string
          price_value?: number
          region?: string | null
          slug?: string | null
          sqft?: string | null
          status?: string
          title: string
          type?: string
          units?: number
          updated_at?: string
          video_url?: string | null
          year_built?: number | null
        }
        Update: {
          amenities?: string[] | null
          area?: string | null
          baths?: number
          beds?: number
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          gps_lat?: number | null
          gps_lng?: number | null
          id?: number
          image_url?: string | null
          images?: string[] | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          location?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking?: number | null
          price?: string
          price_value?: number
          region?: string | null
          slug?: string | null
          sqft?: string | null
          status?: string
          title?: string
          type?: string
          units?: number
          updated_at?: string
          video_url?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      property_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          performed_by: string | null
          performed_by_email: string | null
          property_id: number | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
          property_id?: number | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
          property_id?: number | null
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          performed_by: string | null
          performed_by_email: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      room_availability: {
        Row: {
          booking_id: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          room_id: string
          start_date: string
          status: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          room_id: string
          start_date: string
          status?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          room_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_availability_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[]
          bed_config: string | null
          booking_rules: Json
          capacity: number
          created_at: string
          currency: string
          description: string | null
          id: string
          images: string[]
          name: string
          nightly_price: number
          property_id: number
          room_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          bed_config?: string | null
          booking_rules?: Json
          capacity?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[]
          name: string
          nightly_price?: number
          property_id: number
          room_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          bed_config?: string | null
          booking_rules?: Json
          capacity?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[]
          name?: string
          nightly_price?: number
          property_id?: number
          room_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      properties_public: {
        Row: {
          amenities: string[] | null
          area: string | null
          baths: number | null
          beds: number | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: number | null
          image_url: string | null
          images: string[] | null
          location: string | null
          parking: number | null
          price: string | null
          price_value: number | null
          sqft: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          amenities?: string[] | null
          area?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number | null
          image_url?: string | null
          images?: string[] | null
          location?: string | null
          parking?: number | null
          price?: string | null
          price_value?: number | null
          sqft?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          amenities?: string[] | null
          area?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number | null
          image_url?: string | null
          images?: string[] | null
          location?: string | null
          parking?: number | null
          price?: string | null
          price_value?: number | null
          sqft?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      check_room_availability: {
        Args: { _check_in: string; _check_out: string; _room_id: string }
        Returns: boolean
      }
      create_booking: {
        Args: {
          _check_in: string
          _check_out: string
          _guest_email: string
          _guest_name: string
          _guest_phone?: string
          _guests: number
          _notes?: string
          _room_id: string
        }
        Returns: string
      }
      get_admin_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_admin_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      list_role_audit_log: {
        Args: {
          _action?: string
          _from?: string
          _limit?: number
          _role?: Database["public"]["Enums"]["app_role"]
          _to?: string
        }
        Returns: {
          action: string
          created_at: string
          id: string
          performed_by: string
          performed_by_email: string
          role: Database["public"]["Enums"]["app_role"]
          target_email: string
          target_user_id: string
        }[]
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      slugify: { Args: { _input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
      listing_kind: "sale" | "rental_property" | "hotel" | "commercial_rental"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
      listing_kind: ["sale", "rental_property", "hotel", "commercial_rental"],
    },
  },
} as const
