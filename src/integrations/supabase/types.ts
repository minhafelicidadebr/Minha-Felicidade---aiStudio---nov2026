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
  public: {
    Tables: {
      ai_usage_limits: {
        Row: {
          first_requested_at: string
          function_name: string
          last_requested_at: string
          request_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          first_requested_at?: string
          function_name: string
          last_requested_at?: string
          request_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          first_requested_at?: string
          function_name?: string
          last_requested_at?: string
          request_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          name: string
          school_id: string
          semester: number | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          school_id: string
          semester?: number | null
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          school_id?: string
          semester?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          purpose: string
          resource: string
          row_count: number | null
          scope: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          purpose: string
          resource: string
          row_count?: number | null
          scope?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          purpose?: string
          resource?: string
          row_count?: number | null
          scope?: Json
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_consent_events: {
        Row: {
          created_at: string
          decision: string
          guardian_email: string
          guardian_name: string
          id: string
          occurred_at: string
          policy_version: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision?: string
          guardian_email: string
          guardian_name: string
          id?: string
          occurred_at?: string
          policy_version: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          guardian_email?: string
          guardian_name?: string
          id?: string
          occurred_at?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
      institutional_decision_events: {
        Row: {
          actor_role: string
          actor_user_id: string
          class_id: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          metadata: Json
          organization_id: string
          reason: string
          result: string
          school_id: string | null
          severity: string
          source_entity: string
          source_id: string | null
        }
        Insert: {
          actor_role: string
          actor_user_id: string
          class_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          organization_id: string
          reason: string
          result: string
          school_id?: string | null
          severity?: string
          source_entity: string
          source_id?: string | null
        }
        Update: {
          actor_role?: string
          actor_user_id?: string
          class_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          organization_id?: string
          reason?: string
          result?: string
          school_id?: string | null
          severity?: string
          source_entity?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_decision_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_decision_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_decision_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_invitations: {
        Row: {
          accepted_at: string | null
          class_id: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          organization_id: string
          role: string
          school_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          class_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          organization_id: string
          role: string
          school_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          class_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          organization_id?: string
          role?: string
          school_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_invitations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_memberships: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          organization_id: string
          role: string
          school_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          role: string
          school_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          school_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_memberships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          billing_interval: string | null
          calculated_price_cents: number | null
          city: string | null
          created_at: string
          email: string
          estimated_students: number | null
          id: string
          is_public_ngo: boolean | null
          message: string | null
          name: string
          organization: string | null
          preferred_demo_at: string | null
          schools_count: number | null
          segment: string | null
        }
        Insert: {
          billing_interval?: string | null
          calculated_price_cents?: number | null
          city?: string | null
          created_at?: string
          email: string
          estimated_students?: number | null
          id?: string
          is_public_ngo?: boolean | null
          message?: string | null
          name: string
          organization?: string | null
          preferred_demo_at?: string | null
          schools_count?: number | null
          segment?: string | null
        }
        Update: {
          billing_interval?: string | null
          calculated_price_cents?: number | null
          city?: string | null
          created_at?: string
          email?: string
          estimated_students?: number | null
          id?: string
          is_public_ngo?: boolean | null
          message?: string | null
          name?: string
          organization?: string | null
          preferred_demo_at?: string | null
          schools_count?: number | null
          segment?: string | null
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          last_error: string | null
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          last_error?: string | null
          payload?: Json
          recipient_email: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          recipient_email?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          context: string | null
          created_at: string
          feedback: string | null
          id: string
          organization_id: string | null
          score: number
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          organization_id?: string | null
          score: number
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          organization_id?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          joined_at: string | null
          org_subscription_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          joined_at?: string | null
          org_subscription_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          joined_at?: string | null
          org_subscription_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_subscription_id_fkey"
            columns: ["org_subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_interval: string
          created_at: string
          current_period_end: string | null
          current_period_start: string
          external_subscription_id: string | null
          id: string
          max_seats: number
          metadata: Json | null
          organization_name: string
          owner_id: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_subscription_id?: string | null
          id?: string
          max_seats?: number
          metadata?: Json | null
          organization_name: string
          owner_id: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_subscription_id?: string | null
          id?: string
          max_seats?: number
          metadata?: Json | null
          organization_name?: string
          owner_id?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          name: string
          owner_id: string
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          owner_id: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_intents: {
        Row: {
          amount_brl_cents: number
          billing_interval: string
          claim_token: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          external_reference: string
          id: string
          kind: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          plan_slug: string
          seats_schools: number | null
          seats_students: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_brl_cents: number
          billing_interval: string
          claim_token?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_reference?: string
          id?: string
          kind: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan_slug: string
          seats_schools?: number | null
          seats_students?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_brl_cents?: number
          billing_interval?: string
          claim_token?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_reference?: string
          id?: string
          kind?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan_slug?: string
          seats_schools?: number | null
          seats_students?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          municipality: string | null
          name: string
          organization_id: string
          state_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          municipality?: string | null
          name: string
          organization_id: string
          state_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          municipality?: string | null
          name?: string
          organization_id?: string
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          activity_id: string | null
          activity_type: string
          completed: boolean
          created_at: string
          data: Json | null
          id: string
          module_id: string
          score: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_id?: string | null
          activity_type: string
          completed?: boolean
          created_at?: string
          data?: Json | null
          id?: string
          module_id: string
          score?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          completed?: boolean
          created_at?: string
          data?: Json | null
          id?: string
          module_id?: string
          score?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: Json }
      activate_subscription_from_intent: {
        Args: {
          p_external_reference: string
          p_mp_payment_id: string
          p_mp_status: string
        }
        Returns: Json
      }
      can_read_school: { Args: { _school_id: string }; Returns: boolean }
      claim_escolar_subscription: { Args: never; Returns: Json }
      claim_escolar_with_token: { Args: { _token: string }; Returns: Json }
      create_organization: {
        Args: { _name: string; _slug?: string }
        Returns: Json
      }
      enforce_ai_usage_limit: {
        Args: { _function_name: string }
        Returns: Json
      }
      escalate_indicator: {
        Args: {
          _indicator: string
          _organization_id: string
          _school_id: string
          _severity?: string
        }
        Returns: Json
      }
      get_funnel_overview: { Args: { _days?: number }; Returns: Json }
      get_learning_progress_overview: { Args: never; Returns: Json }
      get_my_guardian_consent_status: { Args: never; Returns: Json }
      get_my_learning_progress_summary: { Args: never; Returns: Json }
      get_my_payment_history: {
        Args: never
        Returns: {
          amount_brl_cents: number
          billing_interval: string
          created_at: string
          kind: string
          payment_ref: string
          plan_name: string
          plan_slug: string
          status: string
        }[]
      }
      get_my_plan: { Args: never; Returns: Json }
      get_my_profile: { Args: never; Returns: Json }
      get_operational_metrics: {
        Args: { _organization_id: string }
        Returns: Json
      }
      get_org_engagement_summary: { Args: { _org_id: string }; Returns: Json }
      get_school_metrics: {
        Args: { _period?: string; _school_id: string }
        Returns: Json
      }
      get_user_plan: { Args: { _user_id: string }; Returns: Json }
      has_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_member: {
        Args: {
          _class_id?: string
          _invited_email: string
          _organization_id: string
          _role: string
          _school_id?: string
        }
        Returns: Json
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      metric_minimum_group_size: { Args: never; Returns: number }
      record_guardian_consent: {
        Args: {
          _guardian_email: string
          _guardian_name: string
          _policy_version: string
        }
        Returns: Json
      }
      request_subscription_cancellation: { Args: never; Returns: Json }
      resend_invitation: { Args: { _invitation_id: string }; Returns: Json }
      run_subscription_lifecycle: {
        Args: { _reminder_days?: number }
        Returns: Json
      }
      set_my_birth_date: { Args: { _birth_date: string }; Returns: Json }
      user_has_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      user_has_my_feature: { Args: { _feature: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "teacher" | "manager"
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
  public: {
    Enums: {
      app_role: ["student", "teacher", "manager"],
    },
  },
} as const
