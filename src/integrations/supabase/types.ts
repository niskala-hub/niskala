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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bio_links: {
        Row: {
          clicks: number
          created_at: string
          icon: string
          id: string
          is_active: boolean
          last_click_at: string | null
          order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          last_click_at?: string | null
          order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          clicks?: number
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          last_click_at?: string | null
          order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_reversal: boolean
          receipt_url: string | null
          reference_id: string | null
          reversed_by: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["cash_flow_type"]
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_reversal?: boolean
          receipt_url?: string | null
          reference_id?: string | null
          reversed_by?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["cash_flow_type"]
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_reversal?: boolean
          receipt_url?: string | null
          reference_id?: string | null
          reversed_by?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["cash_flow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size_id: string | null
          size_name: string | null
          unit_hpp: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size_id?: string | null
          size_name?: string | null
          unit_hpp?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size_id?: string | null
          size_name?: string | null
          unit_hpp?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_profitability"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          channel: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          status: string
          stock_deducted: boolean
          total_hpp: number
          total_price: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          stock_deducted?: boolean
          total_hpp?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          stock_deducted?: boolean
          total_hpp?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          note: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_models: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_motifs: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          model_id: string
          name: string
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          model_id: string
          name: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          model_id?: string
          name?: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_motifs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          category: Database["public"]["Enums"]["size_category"]
          created_at: string
          hpp_price: number | null
          id: string
          ld: number
          name: string | null
          price: number | null
          product_id: string
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["size_category"]
          created_at?: string
          hpp_price?: number | null
          id?: string
          ld?: number
          name?: string | null
          price?: number | null
          product_id: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["size_category"]
          created_at?: string
          hpp_price?: number | null
          id?: string
          ld?: number
          name?: string | null
          price?: number | null
          product_id?: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          hpp_price: number
          id: string
          image_url: string | null
          image_urls: string[]
          name: string
          original_price: number | null
          price: number
          price_status: string | null
          slug: string
          status: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          hpp_price?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          name: string
          original_price?: number | null
          price?: number
          price_status?: string | null
          slug: string
          status?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          hpp_price?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          name?: string
          original_price?: number | null
          price?: number
          price_status?: string | null
          slug?: string
          status?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          must_change_password: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          must_change_password?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          must_change_password?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          coming_soon_enabled: boolean
          id: boolean
        }
        Insert: {
          coming_soon_enabled?: boolean
          id?: boolean
        }
        Update: {
          coming_soon_enabled?: boolean
          id?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_accounting_summary: {
        Row: {
          gross_margin_percent: number | null
          gross_profit_estimate: number | null
          net_cash: number | null
          total_cogs_paid: number | null
          total_inflow: number | null
          total_outflow: number | null
          total_reversals: number | null
          total_sales_inflow: number | null
        }
        Relationships: []
      }
      v_monthly_cash_flow: {
        Row: {
          inflow: number | null
          month: string | null
          month_label: string | null
          net: number | null
          outflow: number | null
        }
        Relationships: []
      }
      v_order_profitability: {
        Row: {
          channel: string | null
          created_at: string | null
          customer_name: string | null
          gross_margin_percent: number | null
          gross_profit: number | null
          order_id: string | null
          paid_at: string | null
          payment_status: string | null
          status: string | null
          total_hpp: number | null
          total_price: number | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          customer_name?: string | null
          gross_margin_percent?: never
          gross_profit?: never
          order_id?: string | null
          paid_at?: string | null
          payment_status?: string | null
          status?: string | null
          total_hpp?: number | null
          total_price?: number | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          customer_name?: string | null
          gross_margin_percent?: never
          gross_profit?: never
          order_id?: string | null
          paid_at?: string | null
          payment_status?: string | null
          status?: string | null
          total_hpp?: number | null
          total_price?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_dashboard_summary: { Args: never; Returns: Json }
      get_order_report_breakdown: {
        Args: {
          p_channel?: string
          p_end_date: string
          p_payment_status?: string
          p_period?: string
          p_start_date: string
        }
        Returns: {
          items_sold: number
          order_count: number
          period_bucket: string
          total_cogs: number
          total_profit: number
          total_revenue: number
        }[]
      }
      get_order_report_summary: {
        Args: {
          p_channel?: string
          p_end_date?: string
          p_payment_status?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_top_selling_variants: {
        Args: { p_end_date?: string; p_limit?: number; p_start_date?: string }
        Returns: {
          product_id: string
          product_name: string
          quantity_sold: number
          size_name: string
          total_profit: number
          total_revenue: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_bio_link_click: {
        Args: { _link_id: string }
        Returns: undefined
      }
      is_owner_or_coowner: { Args: { _user_id: string }; Returns: boolean }
      validate_order_stock: {
        Args: { p_order_id: string }
        Returns: {
          available: number
          is_sufficient: boolean
          product_id: string
          product_name: string
          requested: number
          size_id: string
          size_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "owner" | "co_owner"
      cash_flow_type: "inflow" | "outflow"
      size_category: "Reguler" | "Jumbo Size"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user", "owner", "co_owner"],
      cash_flow_type: ["inflow", "outflow"],
      size_category: ["Reguler", "Jumbo Size"],
    },
  },
} as const
