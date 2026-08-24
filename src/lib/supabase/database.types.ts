// Generated from the live Supabase schema. Do not edit by hand.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      availability_change_requests: {
        Row: {
          consultant_id: string
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          slot_start: string
          status: Database["public"]["Enums"]["change_request_status"]
        }
        Insert: {
          consultant_id: string
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          slot_start: string
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Update: {
          consultant_id?: string
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          slot_start?: string
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_change_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_windows: {
        Row: {
          consultant_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          consultant_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          consultant_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_windows_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          called_at: string
          caller_id: string
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Insert: {
          called_at?: string
          caller_id: string
          id?: string
          lead_id: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Update: {
          called_at?: string
          caller_id?: string
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_requests: {
        Row: {
          caller_id: string
          created_at: string
          id: string
          note: string | null
          requested_count: number
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["lead_request_status"]
        }
        Insert: {
          caller_id: string
          created_at?: string
          id?: string
          note?: string | null
          requested_count: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["lead_request_status"]
        }
        Update: {
          caller_id?: string
          created_at?: string
          id?: string
          note?: string | null
          requested_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["lead_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_requests_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_caller_id: string | null
          business_name: string | null
          created_at: string
          email: string | null
          follow_up_at: string | null
          id: string
          location: string | null
          name: string
          not_interested_reason: string | null
          phone: string | null
          ref: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_caller_id?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          follow_up_at?: string | null
          id?: string
          location?: string | null
          name: string
          not_interested_reason?: string | null
          phone?: string | null
          ref?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_caller_id?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          follow_up_at?: string | null
          id?: string
          location?: string | null
          name?: string
          not_interested_reason?: string | null
          phone?: string | null
          ref?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_caller_id_fkey"
            columns: ["assigned_caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          analysis_output: string | null
          caller_id: string
          completed_at: string | null
          consultant_id: string
          context_notes: string | null
          created_at: string
          follow_up_meeting_id: string | null
          guest_email: string | null
          id: string
          invoice_sent_at: string | null
          lead_id: string
          location_detail: string | null
          location_type: Database["public"]["Enums"]["meeting_location"]
          package_name: string | null
          proposal_sent_at: string | null
          result: Database["public"]["Enums"]["meeting_result"]
          result_notes: string | null
          scheduled_end: string
          scheduled_start: string
        }
        Insert: {
          analysis_output?: string | null
          caller_id: string
          completed_at?: string | null
          consultant_id: string
          context_notes?: string | null
          created_at?: string
          follow_up_meeting_id?: string | null
          guest_email?: string | null
          id?: string
          invoice_sent_at?: string | null
          lead_id: string
          location_detail?: string | null
          location_type?: Database["public"]["Enums"]["meeting_location"]
          package_name?: string | null
          proposal_sent_at?: string | null
          result?: Database["public"]["Enums"]["meeting_result"]
          result_notes?: string | null
          scheduled_end: string
          scheduled_start: string
        }
        Update: {
          analysis_output?: string | null
          caller_id?: string
          completed_at?: string | null
          consultant_id?: string
          context_notes?: string | null
          created_at?: string
          follow_up_meeting_id?: string | null
          guest_email?: string | null
          id?: string
          invoice_sent_at?: string | null
          lead_id?: string
          location_detail?: string | null
          location_type?: Database["public"]["Enums"]["meeting_location"]
          package_name?: string | null
          proposal_sent_at?: string | null
          result?: Database["public"]["Enums"]["meeting_result"]
          result_notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_follow_up_meeting_id_fkey"
            columns: ["follow_up_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      tool_resources: {
        Row: {
          agent_label: string | null
          agent_url: string | null
          id: string
          instructions: string | null
          key: string
          links: Json
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_label?: string | null
          agent_url?: string | null
          id?: string
          instructions?: string | null
          key: string
          links?: Json
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_label?: string | null
          agent_url?: string | null
          id?: string
          instructions?: string | null
          key?: string
          links?: Json
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_resources_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_meeting_at: {
        Args: {
          p_consultant_id: string
          p_context_notes: string
          p_duration_minutes: number
          p_lead_id: string
          p_location_detail?: string
          p_location_type?: string
          p_start: string
        }
        Returns: {
          analysis_output: string | null
          caller_id: string
          completed_at: string | null
          consultant_id: string
          context_notes: string | null
          created_at: string
          follow_up_meeting_id: string | null
          guest_email: string | null
          id: string
          invoice_sent_at: string | null
          lead_id: string
          location_detail: string | null
          location_type: Database["public"]["Enums"]["meeting_location"]
          package_name: string | null
          proposal_sent_at: string | null
          result: Database["public"]["Enums"]["meeting_result"]
          result_notes: string | null
          scheduled_end: string
          scheduled_start: string
        }
        SetofOptions: {
          from: "*"
          to: "meetings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_meeting_auto: {
        Args: {
          p_context_notes: string
          p_duration_minutes: number
          p_guest_email?: string
          p_lead_id: string
          p_location_detail?: string
          p_location_type?: string
          p_start: string
        }
        Returns: {
          analysis_output: string | null
          caller_id: string
          completed_at: string | null
          consultant_id: string
          context_notes: string | null
          created_at: string
          follow_up_meeting_id: string | null
          guest_email: string | null
          id: string
          invoice_sent_at: string | null
          lead_id: string
          location_detail: string | null
          location_type: Database["public"]["Enums"]["meeting_location"]
          package_name: string | null
          proposal_sent_at: string | null
          result: Database["public"]["Enums"]["meeting_result"]
          result_notes: string | null
          scheduled_end: string
          scheduled_start: string
        }
        SetofOptions: {
          from: "*"
          to: "meetings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      busy_times: {
        Args: { p_consultant_id: string; p_from: string; p_to: string }
        Returns: {
          busy_end: string
          busy_start: string
        }[]
      }
    }
    Enums: {
      call_outcome:
        | "interested"
        | "not_interested"
        | "callback_later"
        | "no_answer"
      change_request_status: "pending" | "approved" | "declined"
      lead_request_status: "pending" | "fulfilled" | "declined"
      lead_status:
        | "new"
        | "callback"
        | "no_answer"
        | "not_interested"
        | "booked"
        | "no_show"
      meeting_location: "google_meet" | "phone"
      meeting_result:
        | "pending"
        | "onboarded"
        | "follow_up"
        | "not_interested"
        | "no_show"
      user_role: "admin" | "caller" | "consultant"
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
      call_outcome: [
        "interested",
        "not_interested",
        "callback_later",
        "no_answer",
      ],
      change_request_status: ["pending", "approved", "declined"],
      lead_request_status: ["pending", "fulfilled", "declined"],
      lead_status: [
        "new",
        "callback",
        "no_answer",
        "not_interested",
        "booked",
        "no_show",
      ],
      meeting_location: ["google_meet", "phone"],
      meeting_result: [
        "pending",
        "onboarded",
        "follow_up",
        "not_interested",
        "no_show",
      ],
      user_role: ["admin", "caller", "consultant"],
    },
  },
} as const
