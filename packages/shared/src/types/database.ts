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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          at: string
          detail: Json
          id: number
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          at?: string
          detail?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          at?: string
          detail?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_id: string
          channel: Database["public"]["Enums"]["contact_channel"]
          contact_id: string | null
          created_at: string
          error: string | null
          id: string
          provider_ref: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notif_status"]
        }
        Insert: {
          alert_id: string
          channel: Database["public"]["Enums"]["contact_channel"]
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
        }
        Update: {
          alert_id?: string
          channel?: Database["public"]["Enums"]["contact_channel"]
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          last_known_at: string | null
          last_known_geom: unknown
          level: Database["public"]["Enums"]["safety_state"]
          org_id: string | null
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          triggered_at: string
          user_id: string
          was_false_alarm: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_known_at?: string | null
          last_known_geom?: unknown
          level: Database["public"]["Enums"]["safety_state"]
          org_id?: string | null
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          triggered_at?: string
          user_id: string
          was_false_alarm?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          last_known_at?: string | null
          last_known_geom?: unknown
          level?: Database["public"]["Enums"]["safety_state"]
          org_id?: string | null
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          triggered_at?: string
          user_id?: string
          was_false_alarm?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "travel_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      country_emergency_numbers: {
        Row: {
          ambulance: string | null
          country_code: string
          country_name: string
          embassy_br_url: string | null
          fire: string | null
          notes: string | null
          police: string | null
          tourist_police: string | null
          universal: string | null
        }
        Insert: {
          ambulance?: string | null
          country_code: string
          country_name: string
          embassy_br_url?: string | null
          fire?: string | null
          notes?: string | null
          police?: string | null
          tourist_police?: string | null
          universal?: string | null
        }
        Update: {
          ambulance?: string | null
          country_code?: string
          country_name?: string
          embassy_br_url?: string | null
          fire?: string | null
          notes?: string | null
          police?: string | null
          tourist_police?: string | null
          universal?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          install_id: string
          is_primary: boolean
          label: string | null
          last_seen_at: string
          last_signal_at: string | null
          model: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          push_token: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          install_id: string
          is_primary?: boolean
          label?: string | null
          last_seen_at?: string
          last_signal_at?: string | null
          model?: string | null
          os_version?: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          push_token?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          install_id?: string
          is_primary?: boolean
          label?: string | null
          last_seen_at?: string
          last_signal_at?: string | null
          model?: string | null
          os_version?: string | null
          platform?: Database["public"]["Enums"]["device_platform"]
          push_token?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dossier_access_log: {
        Row: {
          accessed_at: string
          id: number
          ip: unknown
          token_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          id?: never
          ip?: unknown
          token_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          id?: never
          ip?: unknown
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_access_log_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "dossier_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_tokens: {
        Row: {
          access_count: number
          alert_id: string
          contact_id: string | null
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          access_count?: number
          alert_id: string
          contact_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          access_count?: number
          alert_id?: string
          contact_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_tokens_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_tokens_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_verified: boolean
          locale: string
          phone: string | null
          preferred_channel: Database["public"]["Enums"]["contact_channel"]
          priority: number
          relationship: string | null
          updated_at: string
          user_id: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_verified?: boolean
          locale?: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["contact_channel"]
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_verified?: boolean
          locale?: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["contact_channel"]
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      emergency_dossiers: {
        Row: {
          additional_notes: string | null
          allergies: string | null
          blood_type: string | null
          insurance_policy: string | null
          insurance_provider: string | null
          medical_conditions: string | null
          medications: string | null
          passport_masked: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          allergies?: string | null
          blood_type?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          medical_conditions?: string | null
          medications?: string | null
          passport_masked?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          allergies?: string | null
          blood_type?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          medical_conditions?: string | null
          medications?: string | null
          passport_masked?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_dossiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "emergency_dossiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_dossiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      location_logs: {
        Row: {
          accuracy_m: number | null
          altitude_m: number | null
          battery_level: number | null
          city: string | null
          client_ping_id: string
          country_code: string | null
          geocoded_at: string | null
          geom: unknown
          heading: number | null
          id: number
          is_moving: boolean | null
          received_at: string
          recorded_at: string
          region: string | null
          session_id: string | null
          speed_mps: number | null
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          altitude_m?: number | null
          battery_level?: number | null
          city?: string | null
          client_ping_id: string
          country_code?: string | null
          geocoded_at?: string | null
          geom: unknown
          heading?: number | null
          id?: never
          is_moving?: boolean | null
          received_at?: string
          recorded_at: string
          region?: string | null
          session_id?: string | null
          speed_mps?: number | null
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          altitude_m?: number | null
          battery_level?: number | null
          city?: string | null
          client_ping_id?: string
          country_code?: string | null
          geocoded_at?: string | null
          geom?: unknown
          heading?: number | null
          id?: never
          is_moving?: boolean | null
          received_at?: string
          recorded_at?: string
          region?: string | null
          session_id?: string | null
          speed_mps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "travel_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_members: {
        Row: {
          invited_at: string
          joined_at: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          invited_at?: string
          joined_at?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          invited_at?: string
          joined_at?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          seats: number
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          seats?: number
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          seats?: number
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string
          granted_by: string | null
          note: string | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_country: string | null
          date_of_birth: string | null
          full_name: string
          home_country: string | null
          id: string
          locale: string
          onboarding_completed: boolean
          phone: string | null
          push_token: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_country?: string | null
          date_of_birth?: string | null
          full_name: string
          home_country?: string | null
          id: string
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          push_token?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_country?: string | null
          date_of_birth?: string | null
          full_name?: string
          home_country?: string | null
          id?: string
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          push_token?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          device_id: string | null
          external_ref: string | null
          id: number
          kind: Database["public"]["Enums"]["signal_kind"]
          metadata: Json
          occurred_at: string
          received_at: string
          session_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          device_id?: string | null
          external_ref?: string | null
          id?: never
          kind: Database["public"]["Enums"]["signal_kind"]
          metadata?: Json
          occurred_at?: string
          received_at?: string
          session_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          device_id?: string | null
          external_ref?: string | null
          id?: never
          kind?: Database["public"]["Enums"]["signal_kind"]
          metadata?: Json
          occurred_at?: string
          received_at?: string
          session_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "travel_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          org_id: string | null
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_sub_id: string | null
          seats: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string | null
          plan: string
          provider?: string
          provider_customer_id?: string | null
          provider_sub_id?: string | null
          seats?: number
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string | null
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_sub_id?: string | null
          seats?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      travel_sessions: {
        Row: {
          alert_delay: string
          checkin_interval: string
          created_at: string
          destination_label: string | null
          ends_at: string | null
          escalation_step: number
          expected_checkin_at: string
          gps_tracking_enabled: boolean
          grace_period: string
          id: string
          last_signal_at: string
          last_signal_kind: Database["public"]["Enums"]["signal_kind"]
          movement_threshold_m: number
          org_id: string | null
          passive_checkin_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          starts_at: string
          state: Database["public"]["Enums"]["safety_state"]
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_delay?: string
          checkin_interval?: string
          created_at?: string
          destination_label?: string | null
          ends_at?: string | null
          escalation_step?: number
          expected_checkin_at?: string
          gps_tracking_enabled?: boolean
          grace_period?: string
          id?: string
          last_signal_at?: string
          last_signal_kind?: Database["public"]["Enums"]["signal_kind"]
          movement_threshold_m?: number
          org_id?: string | null
          passive_checkin_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          starts_at?: string
          state?: Database["public"]["Enums"]["safety_state"]
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_delay?: string
          checkin_interval?: string
          created_at?: string
          destination_label?: string | null
          ends_at?: string | null
          escalation_step?: number
          expected_checkin_at?: string
          gps_tracking_enabled?: boolean
          grace_period?: string
          id?: string
          last_signal_at?: string
          last_signal_kind?: Database["public"]["Enums"]["signal_kind"]
          movement_threshold_m?: number
          org_id?: string | null
          passive_checkin_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          starts_at?: string
          state?: Database["public"]["Enums"]["safety_state"]
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "travel_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      mv_user_travel_stats: {
        Row: {
          cities_count: number | null
          countries: string[] | null
          countries_count: number | null
          days_tracked: number | null
          earth_laps: number | null
          first_ping_at: string | null
          km_by_air_or_rail: number | null
          km_last_365d: number | null
          last_ping_at: string | null
          manual_checkins: number | null
          passive_checkins: number | null
          refreshed_at: string | null
          total_km: number | null
          trips_active: number | null
          trips_completed: number | null
          user_id: string | null
          world_percent: number | null
        }
        Relationships: []
      }
      v_org_traveler_status: {
        Row: {
          avatar_url: string | null
          city: string | null
          country_code: string | null
          destination_label: string | null
          expected_checkin_at: string | null
          full_name: string | null
          last_lat: number | null
          last_lng: number | null
          last_location_at: string | null
          last_signal_at: string | null
          last_signal_kind: Database["public"]["Enums"]["signal_kind"] | null
          org_id: string | null
          session_id: string | null
          state: Database["public"]["Enums"]["safety_state"] | null
          title: string | null
          traffic_light: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_country_visits: {
        Row: {
          country_code: string | null
          duration: string | null
          entered_at: string | null
          left_at: string | null
          ping_count: number | null
          user_id: string | null
          visit_seq: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_travel_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_org_traveler_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      admin_device_stats: {
        Args: never
        Returns: {
          active_24h: number
          active_7d: number
          platform: Database["public"]["Enums"]["device_platform"]
          signalled_24h: number
          stale_30d: number
          total: number
          with_push: number
        }[]
      }
      admin_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["platform_role"]
      }
      admin_open_incidents: {
        Args: { p_limit?: number }
        Returns: {
          alert_id: string
          city: string
          country_code: string
          device_platform: Database["public"]["Enums"]["device_platform"]
          device_seen_at: string
          email: string
          full_name: string
          last_known_at: string
          level: Database["public"]["Enums"]["safety_state"]
          minutes_open: number
          notif_failed: number
          notif_sent: number
          org_name: string
          reason: string
          triggered_at: string
          user_id: string
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_recent_audit: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          at: string
          detail: Json
          id: number
          target_id: string
          target_type: string
        }[]
      }
      admin_resolve_alert: {
        Args: { p_alert_id: string; p_note: string }
        Returns: boolean
      }
      admin_revoke_platform_role: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      admin_search_users: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          created_at: string
          device_count: number
          email: string
          full_name: string
          last_sign_in_at: string
          last_signal_at: string
          open_alerts: number
          platforms: string[]
          session_state: Database["public"]["Enums"]["safety_state"]
          user_id: string
        }[]
      }
      admin_set_platform_role: {
        Args: {
          p_note?: string
          p_role: Database["public"]["Enums"]["platform_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      admin_system_health: { Args: never; Returns: Json }
      admin_users_without_mobile: {
        Args: { p_limit?: number }
        Returns: {
          active_session: boolean
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      claim_overdue_sessions: {
        Args: { p_limit?: number }
        Returns: {
          escalation_step: number
          new_state: Database["public"]["Enums"]["safety_state"]
          org_id: string
          session_id: string
          user_id: string
        }[]
      }
      get_dossier: { Args: { p_token: string }; Returns: Json }
      get_my_travel_stats: {
        Args: never
        Returns: {
          cities_count: number | null
          countries: string[] | null
          countries_count: number | null
          days_tracked: number | null
          earth_laps: number | null
          first_ping_at: string | null
          km_by_air_or_rail: number | null
          km_last_365d: number | null
          last_ping_at: string | null
          manual_checkins: number | null
          passive_checkins: number | null
          refreshed_at: string | null
          total_km: number | null
          trips_active: number | null
          trips_completed: number | null
          user_id: string | null
          world_percent: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_user_travel_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_trip_history: {
        Args: never
        Returns: {
          checkins: number
          cities: string[]
          countries: string[]
          days: number
          destination_label: string
          ends_at: string
          id: string
          km: number
          pings: number
          starts_at: string
          state: string
          status: string
          title: string
        }[]
      }
      get_org_device_health: {
        Args: { p_org: string }
        Returns: {
          has_push: boolean
          last_seen_at: string
          last_signal_at: string
          platform: Database["public"]["Enums"]["device_platform"]
          user_id: string
        }[]
      }
      get_session_track: {
        Args: { p_session_id: string; p_tolerance_m?: number }
        Returns: Json
      }
      ingest_location_batch: {
        Args: { p_device_id?: string; p_pings: Json }
        Returns: number
      }
      invoke_edge: { Args: { p_body?: Json; p_fn: string }; Returns: number }
      is_org_manager: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_platform_admin: {
        Args: { p_min?: Database["public"]["Enums"]["platform_role"] }
        Returns: boolean
      }
      issue_dossier_token: {
        Args: { p_alert_id: string; p_contact_id?: string; p_ttl?: string }
        Returns: string
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_detail?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      meu_plano: {
        Args: never
        Returns: {
          assinante: boolean
          plano: string
          pode_criar: boolean
          renova_em: string
          status: string
          viagens_gratis: number
          viagens_usadas: number
        }[]
      }
      open_alert: {
        Args: {
          p_level: Database["public"]["Enums"]["safety_state"]
          p_reason: string
          p_session_id: string
        }
        Returns: string
      }
      pending_geocode: {
        Args: { p_limit?: number }
        Returns: {
          id: number
          lat: number
          lng: number
          recorded_at: string
          user_id: string
        }[]
      }
      record_signal: {
        Args: {
          p_device_id?: string
          p_external_ref?: string
          p_kind: Database["public"]["Enums"]["signal_kind"]
          p_metadata?: Json
          p_occurred_at?: string
          p_session_id: string
          p_source?: string
        }
        Returns: {
          alert_delay: string
          checkin_interval: string
          created_at: string
          destination_label: string | null
          ends_at: string | null
          escalation_step: number
          expected_checkin_at: string
          gps_tracking_enabled: boolean
          grace_period: string
          id: string
          last_signal_at: string
          last_signal_kind: Database["public"]["Enums"]["signal_kind"]
          movement_threshold_m: number
          org_id: string | null
          passive_checkin_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          starts_at: string
          state: Database["public"]["Enums"]["safety_state"]
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "travel_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_device: {
        Args: {
          p_app_version?: string
          p_install_id: string
          p_label?: string
          p_model?: string
          p_os_version?: string
          p_platform: Database["public"]["Enums"]["device_platform"]
          p_push_token?: string
        }
        Returns: {
          app_version: string | null
          created_at: string
          id: string
          install_id: string
          is_primary: boolean
          label: string | null
          last_seen_at: string
          last_signal_at: string | null
          model: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          push_token: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      require_platform_admin: {
        Args: { p_min?: Database["public"]["Enums"]["platform_role"] }
        Returns: undefined
      }
      resolve_alert_by_token: {
        Args: { p_note?: string; p_token: string }
        Returns: boolean
      }
      revoke_device: { Args: { p_device_id: string }; Returns: boolean }
      tem_assinatura_ativa: { Args: { p_user?: string }; Returns: boolean }
    }
    Enums: {
      contact_channel: "email" | "sms" | "whatsapp" | "push"
      device_platform: "ios" | "android" | "web"
      notif_status: "queued" | "sent" | "delivered" | "failed" | "read"
      org_role: "owner" | "admin" | "manager" | "member"
      platform_role: "support" | "admin" | "superadmin"
      safety_state: "safe" | "grace" | "warning" | "alert" | "sos" | "resolved"
      session_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      signal_kind:
        | "manual_checkin"
        | "device_movement"
        | "app_open"
        | "gps_ping"
        | "sos"
        | "admin_override"
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
      contact_channel: ["email", "sms", "whatsapp", "push"],
      device_platform: ["ios", "android", "web"],
      notif_status: ["queued", "sent", "delivered", "failed", "read"],
      org_role: ["owner", "admin", "manager", "member"],
      platform_role: ["support", "admin", "superadmin"],
      safety_state: ["safe", "grace", "warning", "alert", "sos", "resolved"],
      session_status: ["draft", "active", "paused", "completed", "cancelled"],
      signal_kind: [
        "manual_checkin",
        "device_movement",
        "app_open",
        "gps_ping",
        "sos",
        "admin_override",
      ],
    },
  },
} as const
