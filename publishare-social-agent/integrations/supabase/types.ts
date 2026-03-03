export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_key_audit: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string
          request_data: Json | null
          response_status: number | null
          response_time_ms: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_audit_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_name: string
          key_type: string
          last_used_at: string | null
          permissions: Json
          rotation_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_name: string
          key_type?: string
          last_used_at?: string | null
          permissions?: Json
          rotation_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_name?: string
          key_type?: string
          last_used_at?: string | null
          permissions?: Json
          rotation_count?: number | null
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          user_id?: string | null
        }
        Relationships: []
      }
      article_category_relations: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_category_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_category_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_category_relations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_images: {
        Row: {
          alt_text: string | null
          article_id: string
          caption: string | null
          created_at: string | null
          id: string
          image_type: string
          is_active: boolean | null
          media_id: string
          position: number | null
        }
        Insert: {
          alt_text?: string | null
          article_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_type: string
          is_active?: boolean | null
          media_id: string
          position?: number | null
        }
        Update: {
          alt_text?: string | null
          article_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_type?: string
          is_active?: boolean | null
          media_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "article_images_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_images_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_images_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tag_relations: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tag_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tag_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          breadcrumb_title: string | null
          canonical_url: string | null
          category: string
          category_id: string | null
          content: string
          content_type: string | null
          created_at: string | null
          excerpt: string
          featured_image_alt: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          html_body: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          persona: string | null
          readability_score: number | null
          scheduled_date: string | null
          schema_type: string | null
          seo_score: number | null
          slug: string | null
          status: string | null
          tags: string[] | null
          title: string
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string | null
          user_id: string
          aeo_summary: string | null
          aeo_answer_first: boolean | null
          content_structure: Json | null
          speakable_summary: string | null
          schema_markup: Json | null
          schema_validated: boolean | null
          aeo_content_type: string | null
          citations: Json | null
          data_points: Json | null
        }
        Insert: {
          author_id?: string | null
          breadcrumb_title?: string | null
          canonical_url?: string | null
          category: string
          category_id?: string | null
          content: string
          content_type?: string | null
          created_at?: string | null
          excerpt: string
          featured_image_alt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          html_body?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          persona?: string | null
          readability_score?: number | null
          scheduled_date?: string | null
          schema_type?: string | null
          seo_score?: number | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
          user_id: string
          aeo_summary?: string | null
          aeo_answer_first?: boolean | null
          content_structure?: Json | null
          speakable_summary?: string | null
          schema_markup?: Json | null
          schema_validated?: boolean | null
          aeo_content_type?: string | null
          citations?: Json | null
          data_points?: Json | null
        }
        Update: {
          author_id?: string | null
          breadcrumb_title?: string | null
          canonical_url?: string | null
          category?: string
          category_id?: string | null
          content?: string
          content_type?: string | null
          created_at?: string | null
          excerpt?: string
          featured_image_alt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          html_body?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          persona?: string | null
          readability_score?: number | null
          scheduled_date?: string | null
          schema_type?: string | null
          seo_score?: number | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
          user_id?: string
          aeo_summary?: string | null
          aeo_answer_first?: boolean | null
          content_structure?: Json | null
          speakable_summary?: string | null
          schema_markup?: Json | null
          schema_validated?: boolean | null
          aeo_content_type?: string | null
          citations?: Json | null
          data_points?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_persona_fkey"
            columns: ["persona"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["name"]
          },
        ]
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consultation_requests: {
        Row: {
          condition_details: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          preferred_contact_method: string | null
          status: string | null
          treatment_type: string
          updated_at: string
          user_id: string | null
          zip_code: string
        }
        Insert: {
          condition_details?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          status?: string | null
          treatment_type: string
          updated_at?: string
          user_id?: string | null
          zip_code: string
        }
        Update: {
          condition_details?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          status?: string | null
          treatment_type?: string
          updated_at?: string
          user_id?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      contact_interactions: {
        Row: {
          contact_id: string | null
          created_at: string | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          notes: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          notes?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      content_cache: {
        Row: {
          access_count: number | null
          cache_key: string
          cache_type: string
          content_data: Json
          content_hash: string
          created_at: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          ttl_seconds: number
        }
        Insert: {
          access_count?: number | null
          cache_key: string
          cache_type: string
          content_data: Json
          content_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          ttl_seconds?: number
        }
        Update: {
          access_count?: number | null
          cache_key?: string
          cache_type?: string
          content_data?: Json
          content_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          ttl_seconds?: number
        }
        Relationships: []
      }
      content_pathways: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          pathway_type: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          pathway_type: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          pathway_type?: string
          user_id?: string
        }
        Relationships: []
      }
      content_strategy: {
        Row: {
          call_to_action: string | null
          category: string | null
          competition: string | null
          content_pillar: string | null
          content_title: string | null
          content_type: string | null
          created_at: string | null
          funnel_stage: string | null
          id: string
          last_generation_attempt: string | null
          lead_magnet: string | null
          primary_keyword: string | null
          priority_level: string | null
          search_volume: number | null
          status: string | null
          target_audience: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string | null
          week: string | null
          word_count: number | null
        }
        Insert: {
          call_to_action?: string | null
          category?: string | null
          competition?: string | null
          content_pillar?: string | null
          content_title?: string | null
          content_type?: string | null
          created_at?: string | null
          funnel_stage?: string | null
          id?: string
          last_generation_attempt?: string | null
          lead_magnet?: string | null
          primary_keyword?: string | null
          priority_level?: string | null
          search_volume?: number | null
          status?: string | null
          target_audience?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          week?: string | null
          word_count?: number | null
        }
        Update: {
          call_to_action?: string | null
          category?: string | null
          competition?: string | null
          content_pillar?: string | null
          content_title?: string | null
          content_type?: string | null
          created_at?: string | null
          funnel_stage?: string | null
          id?: string
          last_generation_attempt?: string | null
          lead_magnet?: string | null
          primary_keyword?: string | null
          priority_level?: string | null
          search_volume?: number | null
          status?: string | null
          target_audience?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          week?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      content_templates: {
        Row: {
          business_type: string
          content: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          persona: string | null
          template_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_type: string
          content: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          persona?: string | null
          template_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_type?: string
          content?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          persona?: string | null
          template_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string | null
          form_data: Json
          form_type: string
          id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          form_data: Json
          form_type: string
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          article_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          filename: string
          generated_by: string | null
          height: number | null
          id: string
          image_type: string
          is_featured: boolean | null
          is_public: boolean | null
          original_filename: string | null
          prompt: string | null
          style: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          article_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url: string
          filename: string
          generated_by?: string | null
          height?: number | null
          id?: string
          image_type: string
          is_featured?: boolean | null
          is_public?: boolean | null
          original_filename?: string | null
          prompt?: string | null
          style?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          article_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          filename?: string
          generated_by?: string | null
          height?: number | null
          id?: string
          image_type?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          original_filename?: string | null
          prompt?: string | null
          style?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_library_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          created_at: string | null
          endpoint: string
          error_count: number | null
          id: string
          ip_address: unknown | null
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_count?: number | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms: number
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_count?: number | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          ai_prompt: string
          call_to_action_style: string | null
          category_mapping: string[]
          content_style: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          expertise_level: string | null
          id: string
          name: string
          target_audience: Json | null
          tone_voice: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_prompt: string
          call_to_action_style?: string | null
          category_mapping: string[]
          content_style?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          expertise_level?: string | null
          id?: string
          name: string
          target_audience?: Json | null
          tone_voice?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_prompt?: string
          call_to_action_style?: string | null
          category_mapping?: string[]
          content_style?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          expertise_level?: string | null
          id?: string
          name?: string
          target_audience?: Json | null
          tone_voice?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_type: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          persona: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          persona?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          persona?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_status: {
        Row: {
          analytics: Json | null
          article_id: string | null
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          last_posted_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          analytics?: Json | null
          article_id?: string | null
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_posted_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          analytics?: Json | null
          article_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_posted_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_status_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_status_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          quiz_session_id: string | null
          response_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          quiz_session_id?: string | null
          response_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          quiz_session_id?: string | null
          response_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          id: string
          quiz_type: string
          results: Json | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          quiz_type: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          quiz_type?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit: {
        Row: {
          action_type: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          request_method: string | null
          request_path: string | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_media_content: {
        Row: {
          article_id: string | null
          content: Json
          content_type: string
          created_at: string | null
          generated_at: string | null
          id: string
          platform: string | null
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          content: Json
          content_type: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          platform?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          content?: Json
          content_type?: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          platform?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_content_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_content_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          component: string
          created_at: string | null
          details: Json | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          severity: string | null
        }
        Insert: {
          component: string
          created_at?: string | null
          details?: Json | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          severity?: string | null
        }
        Update: {
          component?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          severity?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
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
      utm_sessions: {
        Row: {
          contact_id: string | null
          id: string
          landing_page: string | null
          referrer: string | null
          session_ended_at: string | null
          session_started_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          id?: string
          landing_page?: string | null
          referrer?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          id?: string
          landing_page?: string | null
          referrer?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      articles_with_tags: {
        Row: {
          author_id: string | null
          breadcrumb_title: string | null
          canonical_url: string | null
          category: string | null
          category_id: string | null
          category_name: string | null
          content: string | null
          content_type: string | null
          created_at: string | null
          excerpt: string | null
          featured_image_alt: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          id: string | null
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          readability_score: number | null
          schema_type: string | null
          seo_score: number | null
          slug: string | null
          status: string | null
          tags_csv: string | null
          title: string | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      change_user_subscription: {
        Args: {
          target_user_id: string
          new_plan_name: string
          new_status?: string
        }
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_default_author_for_user: {
        Args: { user_uuid: string; user_email: string; user_name: string }
        Returns: string
      }
      get_all_tags: {
        Args: Record<PropertyKey, never>
        Returns: {
          tag: string
          count: number
        }[]
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
          last_sign_in: string
          article_count: number
          is_active: boolean
        }[]
      }
      get_article_images: {
        Args: { article_uuid: string }
        Returns: {
          id: string
          media_id: string
          image_type: string
          img_position: number
          caption: string
          alt_text: string
          is_active: boolean
          file_url: string
          file_type: string
          width: number
          height: number
          style: string
          prompt: string
        }[]
      }
      get_media_library: {
        Args: {
          p_category?: string
          p_image_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          filename: string
          file_url: string
          file_type: string
          width: number
          height: number
          alt_text: string
          description: string
          tags: string[]
          category: string
          image_type: string
          style: string
          prompt: string
          is_featured: boolean
          created_at: string
        }[]
      }
      get_persona_ai_prompt: {
        Args: { persona_name: string }
        Returns: string
      }
      get_persona_by_category: {
        Args: { category_name: string }
        Returns: string
      }
      get_persona_display_name: {
        Args: { persona_name: string }
        Returns: string
      }
      get_system_health_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          latest_value: number
          severity: string
          component: string
          last_updated: string
        }[]
      }
      get_system_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          active_users: number
          total_articles: number
          total_calculators: number
          total_contacts: number
          recent_signups: number
          recent_articles: number
          system_health: Json
        }[]
      }
      get_templates_for_user: {
        Args: { user_uuid: string; p_template_type?: string }
        Returns: {
          id: string
          name: string
          description: string
          template_type: string
          business_type: string
          persona: string
          content: Json
          is_default: boolean
        }[]
      }
      get_user_authors: {
        Args: { user_uuid: string }
        Returns: {
          id: string
          name: string
          email: string
          role: string
          is_active: boolean
          article_count: number
        }[]
      }
      get_user_dashboard_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_articles: number
          total_calculators: number
          total_contacts: number
          recent_articles_count: number
        }[]
      }
      get_user_onboarding_status: {
        Args: { user_uuid: string }
        Returns: {
          business_type: string
          persona: string
          onboarding_completed: boolean
          onboarding_completed_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_subscription_details: {
        Args: { target_user_id: string }
        Returns: {
          user_id: string
          user_email: string
          plan_name: string
          subscription_status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { _user_id: string }
        Returns: boolean
      }
      log_api_key_usage: {
        Args: {
          p_key_id: string
          p_endpoint: string
          p_method: string
          p_response_status: number
          p_response_time_ms: number
          p_error_message?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action_type: string
          p_resource_type: string
          p_resource_id?: string
          p_old_values?: Json
          p_new_values?: Json
          p_success?: boolean
          p_error_message?: string
          p_metadata?: Json
        }
        Returns: string
      }
      mark_onboarding_completed: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      remove_user_completely: {
        Args: { target_user_id: string }
        Returns: Json
      }
      rotate_api_key: {
        Args: { p_key_id: string }
        Returns: string
      }
      save_ai_generated_image: {
        Args: {
          p_filename: string
          p_file_url: string
          p_image_type: string
          p_style: string
          p_prompt: string
          p_article_id?: string
          p_alt_text?: string
          p_category?: string
        }
        Returns: string
      }
      search_articles_by_tags: {
        Args: { tag_list: string[] }
        Returns: {
          id: string
          title: string
          slug: string
          excerpt: string
          category: string
          status: string
          tags: string[]
          created_at: string
          updated_at: string
        }[]
      }
      suggest_tags_for_article: {
        Args: {
          article_title: string
          article_content: string
          article_category: string
        }
        Returns: string[]
      }
      switch_to_user_context: {
        Args: { target_user_id: string }
        Returns: Json
      }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          is_valid: boolean
          key_id: string
          key_type: string
          permissions: Json
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
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
      app_role: ["admin", "editor", "user"],
    },
  },
} as const
