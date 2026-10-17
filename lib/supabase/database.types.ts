export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      household_learned_prefs: {
        Row: {
          household_id: string
          max_minutes_by_meal_type: Json
          price_sensitivity: number
          updated_at: string
        }
        Insert: {
          household_id: string
          max_minutes_by_meal_type?: Json
          price_sensitivity?: number
          updated_at?: string
        }
        Update: {
          household_id?: string
          max_minutes_by_meal_type?: Json
          price_sensitivity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_learned_prefs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_recipe_overrides: {
        Row: {
          cover_image_path: string | null
          household_id: string
          recipe_id: string
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          household_id: string
          recipe_id: string
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          household_id?: string
          recipe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_recipe_overrides_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_recipe_overrides_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      household_stores: {
        Row: {
          created_at: string
          household_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_stores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          city: string
          created_at: string
          equipment: Database["public"]["Enums"]["kitchen_equipment"][]
          id: string
          name: string
          onboarded_at: string | null
          servings_adults: number
          servings_kids: number
          styles: Database["public"]["Enums"]["recipe_style"][]
          updated_at: string
          weekly_budget_cop: number | null
        }
        Insert: {
          city?: string
          created_at?: string
          equipment?: Database["public"]["Enums"]["kitchen_equipment"][]
          id?: string
          name: string
          onboarded_at?: string | null
          servings_adults?: number
          servings_kids?: number
          styles?: Database["public"]["Enums"]["recipe_style"][]
          updated_at?: string
          weekly_budget_cop?: number | null
        }
        Update: {
          city?: string
          created_at?: string
          equipment?: Database["public"]["Enums"]["kitchen_equipment"][]
          id?: string
          name?: string
          onboarded_at?: string | null
          servings_adults?: number
          servings_kids?: number
          styles?: Database["public"]["Enums"]["recipe_style"][]
          updated_at?: string
          weekly_budget_cop?: number | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          aliases: string[]
          allergens: Database["public"]["Enums"]["allergen"][]
          base_unit: Database["public"]["Enums"]["base_unit"]
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at: string
          density_g_ml: number | null
          id: string
          name: string
          pantry_staple: boolean
          purchase_unit: Database["public"]["Enums"]["base_unit"] | null
          search_terms: string[]
          slug: string
          status: Database["public"]["Enums"]["ingredient_status"]
          unit_weight_g: number | null
        }
        Insert: {
          aliases?: string[]
          allergens?: Database["public"]["Enums"]["allergen"][]
          base_unit: Database["public"]["Enums"]["base_unit"]
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          density_g_ml?: number | null
          id?: string
          name: string
          pantry_staple?: boolean
          purchase_unit?: Database["public"]["Enums"]["base_unit"] | null
          search_terms?: string[]
          slug: string
          status?: Database["public"]["Enums"]["ingredient_status"]
          unit_weight_g?: number | null
        }
        Update: {
          aliases?: string[]
          allergens?: Database["public"]["Enums"]["allergen"][]
          base_unit?: Database["public"]["Enums"]["base_unit"]
          category?: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          density_g_ml?: number | null
          id?: string
          name?: string
          pantry_staple?: boolean
          purchase_unit?: Database["public"]["Enums"]["base_unit"] | null
          search_terms?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["ingredient_status"]
          unit_weight_g?: number | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          household_id: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          result: Json | null
          run_after: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          household_id?: string | null
          id?: string
          kind: string
          last_error?: string | null
          payload?: Json
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          household_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      match_runs: {
        Row: {
          found: number
          ingredient_id: string
          searched_at: string
          store_id: string
        }
        Insert: {
          found?: number
          ingredient_id: string
          searched_at?: string
          store_id: string
        }
        Update: {
          found?: number
          ingredient_id?: string
          searched_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_runs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_runs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          generated_at: string
          household_id: string
          id: string
          week_start: string
        }
        Insert: {
          generated_at?: string
          household_id: string
          id?: string
          week_start: string
        }
        Update: {
          generated_at?: string
          household_id?: string
          id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          accent_color: Database["public"]["Enums"]["member_accent"]
          created_at: string
          display_name: string
          household_id: string
          id: string
          onboarded_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          accent_color: Database["public"]["Enums"]["member_accent"]
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          accent_color?: Database["public"]["Enums"]["member_accent"]
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_brands: {
        Row: {
          brand: string
          created_at: string
          household_id: string
          ingredient_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          household_id: string
          ingredient_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          household_id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_brands_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_brands_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_meals: {
        Row: {
          adjustments: Json
          created_at: string
          day: string
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string | null
          servings: number
          status: Database["public"]["Enums"]["plan_meal_status"]
        }
        Insert: {
          adjustments?: Json
          created_at?: string
          day: string
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id?: string | null
          servings: number
          status?: Database["public"]["Enums"]["plan_meal_status"]
        }
        Update: {
          adjustments?: Json
          created_at?: string
          day?: string
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          recipe_id?: string | null
          servings?: number
          status?: Database["public"]["Enums"]["plan_meal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_meals_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          captured_at: string
          id: string
          list_price_cop: number | null
          price_cop: number
          product_id: string
          source: Database["public"]["Enums"]["price_source"]
        }
        Insert: {
          captured_at?: string
          id?: string
          list_price_cop?: number | null
          price_cop: number
          product_id: string
          source?: Database["public"]["Enums"]["price_source"]
        }
        Update: {
          captured_at?: string
          id?: string
          list_price_cop?: number | null
          price_cop?: number
          product_id?: string
          source?: Database["public"]["Enums"]["price_source"]
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_matches: {
        Row: {
          confidence: number
          created_at: string
          id: string
          ingredient_id: string
          product_id: string
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          ingredient_id: string
          product_id: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_matches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_matches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          brand: string | null
          id: string
          image_url: string | null
          last_seen_at: string
          name: string
          package_qty: number
          package_unit: Database["public"]["Enums"]["base_unit"]
          sku: string
          store_id: string
          url: string | null
        }
        Insert: {
          available?: boolean
          brand?: string | null
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name: string
          package_qty: number
          package_unit: Database["public"]["Enums"]["base_unit"]
          sku: string
          store_id: string
          url?: string | null
        }
        Update: {
          available?: boolean
          brand?: string | null
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name?: string
          package_qty?: number
          package_unit?: Database["public"]["Enums"]["base_unit"]
          sku?: string
          store_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          member_id: string
          plan_meal_id: string | null
          reason: Database["public"]["Enums"]["replace_reason"] | null
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          member_id: string
          plan_meal_id?: string | null
          reason?: Database["public"]["Enums"]["replace_reason"] | null
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          member_id?: string
          plan_meal_id?: string | null
          reason?: Database["public"]["Enums"]["replace_reason"] | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_plan_meal_fk"
            columns: ["plan_meal_id"]
            isOneToOne: false
            referencedRelation: "plan_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          ingredient_id: string
          note: string | null
          position: number
          quantity: number | null
          recipe_id: string
          role: Database["public"]["Enums"]["ingredient_role"]
          substitute_ids: string[]
          unit: string | null
        }
        Insert: {
          ingredient_id: string
          note?: string | null
          position: number
          quantity?: number | null
          recipe_id: string
          role?: Database["public"]["Enums"]["ingredient_role"]
          substitute_ids?: string[]
          unit?: string | null
        }
        Update: {
          ingredient_id?: string
          note?: string | null
          position?: number
          quantity?: number | null
          recipe_id?: string
          role?: Database["public"]["Enums"]["ingredient_role"]
          substitute_ids?: string[]
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          position: number
          recipe_id: string
          text: string
          video_start_seconds: number | null
        }
        Insert: {
          position: number
          recipe_id: string
          text: string
          video_start_seconds?: number | null
        }
        Update: {
          position?: number
          recipe_id?: string
          text?: string
          video_start_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          ai_confidence: number | null
          author_handle: string | null
          author_name: string | null
          author_url: string | null
          carbs_g: number | null
          created_at: string
          equipment: Database["public"]["Enums"]["kitchen_equipment"][]
          fat_g: number | null
          id: string
          imported_by_household_id: string | null
          kcal_per_serving: number | null
          meal_types: Database["public"]["Enums"]["meal_type"][]
          nutrition_estimated: boolean
          protein_g: number | null
          servings: number
          source_image_path: string | null
          source_platform: Database["public"]["Enums"]["source_platform"]
          source_url: string | null
          source_video_id: string | null
          status: Database["public"]["Enums"]["recipe_status"]
          styles: Database["public"]["Enums"]["recipe_style"][]
          title: string
          total_minutes: number | null
          updated_at: string
          visibility: Database["public"]["Enums"]["recipe_visibility"]
        }
        Insert: {
          ai_confidence?: number | null
          author_handle?: string | null
          author_name?: string | null
          author_url?: string | null
          carbs_g?: number | null
          created_at?: string
          equipment?: Database["public"]["Enums"]["kitchen_equipment"][]
          fat_g?: number | null
          id?: string
          imported_by_household_id?: string | null
          kcal_per_serving?: number | null
          meal_types: Database["public"]["Enums"]["meal_type"][]
          nutrition_estimated?: boolean
          protein_g?: number | null
          servings?: number
          source_image_path?: string | null
          source_platform: Database["public"]["Enums"]["source_platform"]
          source_url?: string | null
          source_video_id?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          styles?: Database["public"]["Enums"]["recipe_style"][]
          title: string
          total_minutes?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Update: {
          ai_confidence?: number | null
          author_handle?: string | null
          author_name?: string | null
          author_url?: string | null
          carbs_g?: number | null
          created_at?: string
          equipment?: Database["public"]["Enums"]["kitchen_equipment"][]
          fat_g?: number | null
          id?: string
          imported_by_household_id?: string | null
          kcal_per_serving?: number | null
          meal_types?: Database["public"]["Enums"]["meal_type"][]
          nutrition_estimated?: boolean
          protein_g?: number | null
          servings?: number
          source_image_path?: string | null
          source_platform?: Database["public"]["Enums"]["source_platform"]
          source_url?: string | null
          source_video_id?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          styles?: Database["public"]["Enums"]["recipe_style"][]
          title?: string
          total_minutes?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_imported_by_household_id_fkey"
            columns: ["imported_by_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      restrictions: {
        Row: {
          allergen: Database["public"]["Enums"]["allergen"] | null
          created_at: string
          diet: Database["public"]["Enums"]["diet"] | null
          id: string
          ingredient_category:
            | Database["public"]["Enums"]["ingredient_category"]
            | null
          ingredient_id: string | null
          kind: Database["public"]["Enums"]["restriction_kind"]
          member_id: string
        }
        Insert: {
          allergen?: Database["public"]["Enums"]["allergen"] | null
          created_at?: string
          diet?: Database["public"]["Enums"]["diet"] | null
          id?: string
          ingredient_category?:
            | Database["public"]["Enums"]["ingredient_category"]
            | null
          ingredient_id?: string | null
          kind: Database["public"]["Enums"]["restriction_kind"]
          member_id: string
        }
        Update: {
          allergen?: Database["public"]["Enums"]["allergen"] | null
          created_at?: string
          diet?: Database["public"]["Enums"]["diet"] | null
          id?: string
          ingredient_category?:
            | Database["public"]["Enums"]["ingredient_category"]
            | null
          ingredient_id?: string | null
          kind?: Database["public"]["Enums"]["restriction_kind"]
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restrictions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restrictions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          api_path_prefix: string | null
          base_url: string | null
          brand_color: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          source: Database["public"]["Enums"]["store_source"]
        }
        Insert: {
          api_path_prefix?: string | null
          base_url?: string | null
          brand_color?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          source: Database["public"]["Enums"]["store_source"]
        }
        Update: {
          api_path_prefix?: string | null
          base_url?: string | null
          brand_color?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          source?: Database["public"]["Enums"]["store_source"]
        }
        Relationships: []
      }
    }
    Views: {
      current_prices: {
        Row: {
          captured_at: string | null
          list_price_cop: number | null
          price_cop: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_display_name: string; p_token: string }
        Returns: string
      }
      can_read_recipe: { Args: { p_recipe_id: string }; Returns: boolean }
      create_household: {
        Args: { p_display_name: string; p_name: string }
        Returns: string
      }
      create_invitation: { Args: never; Returns: string }
      current_household_id: { Args: never; Returns: string }
      current_member_id: { Args: never; Returns: string }
      get_invitation: {
        Args: { p_token: string }
        Returns: {
          household_name: string
          inviter_name: string
          status: string
        }[]
      }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      merge_ingredient: {
        Args: { p_from: string; p_into: string }
        Returns: undefined
      }
      pin_brand: {
        Args: { p_brand: string; p_ingredient_id: string }
        Returns: undefined
      }
      replace_household_stores: {
        Args: { p_store_ids: string[] }
        Returns: undefined
      }
      replace_my_restrictions: {
        Args: {
          p_allergens?: Database["public"]["Enums"]["allergen"][]
          p_categories?: Database["public"]["Enums"]["ingredient_category"][]
          p_diets?: Database["public"]["Enums"]["diet"][]
          p_ingredient_ids?: string[]
          p_kind: Database["public"]["Enums"]["restriction_kind"]
        }
        Returns: undefined
      }
      replace_plan_meal: {
        Args: {
          p_adjustments?: Json
          p_plan_meal_id: string
          p_reason: Database["public"]["Enums"]["replace_reason"]
          p_recipe_id: string
        }
        Returns: undefined
      }
      review_recipe: {
        Args: {
          p_approve: boolean
          p_meal_types?: Database["public"]["Enums"]["meal_type"][]
          p_recipe_id: string
        }
        Returns: undefined
      }
      save_week_plan: {
        Args: { p_meals: Json; p_week_start: string }
        Returns: string
      }
      set_recipe_ingredient_role: {
        Args: {
          p_position: number
          p_recipe_id: string
          p_role: Database["public"]["Enums"]["ingredient_role"]
        }
        Returns: undefined
      }
    }
    Enums: {
      allergen:
        | "peanut"
        | "tree_nut"
        | "dairy"
        | "egg"
        | "gluten"
        | "soy"
        | "fish"
        | "shellfish"
        | "sesame"
      base_unit: "g" | "ml" | "unit"
      diet:
        | "vegetarian"
        | "vegan"
        | "pescatarian"
        | "gluten_free"
        | "dairy_free"
      ingredient_category:
        | "produce"
        | "herbs"
        | "meat"
        | "poultry"
        | "fish"
        | "seafood"
        | "dairy"
        | "eggs"
        | "grains"
        | "legumes"
        | "bakery"
        | "pantry"
        | "spices"
        | "condiments"
        | "oils"
        | "sweeteners"
        | "beverages"
        | "nuts_seeds"
        | "other"
      ingredient_role: "core" | "accessory"
      ingredient_status: "active" | "pending_review"
      job_status: "queued" | "running" | "done" | "failed"
      kitchen_equipment:
        | "oven"
        | "stovetop"
        | "microwave"
        | "air_fryer"
        | "pressure_cooker"
        | "slow_cooker"
        | "blender"
        | "rice_cooker"
      match_status: "auto" | "pending_review" | "confirmed" | "rejected"
      meal_type: "breakfast" | "lunch" | "dinner"
      member_accent: "coral" | "teal"
      member_role: "owner" | "member"
      plan_meal_status: "planned" | "cooked" | "replaced"
      price_source: "api" | "receipt"
      reaction_kind: "favorite" | "dislike" | "veto" | "cooked" | "replaced"
      recipe_status: "pending_review" | "approved" | "rejected"
      recipe_style:
        | "quick"
        | "high_protein"
        | "healthy"
        | "family"
        | "balanced"
        | "low_calorie"
        | "gut_friendly"
        | "one_pot"
      recipe_visibility: "public" | "household"
      replace_reason:
        | "dislike"
        | "too_slow"
        | "too_expensive"
        | "repeated"
        | "not_today"
      restriction_kind: "allergy" | "dislike" | "diet"
      source_platform: "tiktok" | "instagram" | "youtube" | "manual"
      store_source: "vtex" | "instaleap" | "manual"
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
      allergen: [
        "peanut",
        "tree_nut",
        "dairy",
        "egg",
        "gluten",
        "soy",
        "fish",
        "shellfish",
        "sesame",
      ],
      base_unit: ["g", "ml", "unit"],
      diet: ["vegetarian", "vegan", "pescatarian", "gluten_free", "dairy_free"],
      ingredient_category: [
        "produce",
        "herbs",
        "meat",
        "poultry",
        "fish",
        "seafood",
        "dairy",
        "eggs",
        "grains",
        "legumes",
        "bakery",
        "pantry",
        "spices",
        "condiments",
        "oils",
        "sweeteners",
        "beverages",
        "nuts_seeds",
        "other",
      ],
      ingredient_role: ["core", "accessory"],
      ingredient_status: ["active", "pending_review"],
      job_status: ["queued", "running", "done", "failed"],
      kitchen_equipment: [
        "oven",
        "stovetop",
        "microwave",
        "air_fryer",
        "pressure_cooker",
        "slow_cooker",
        "blender",
        "rice_cooker",
      ],
      match_status: ["auto", "pending_review", "confirmed", "rejected"],
      meal_type: ["breakfast", "lunch", "dinner"],
      member_accent: ["coral", "teal"],
      member_role: ["owner", "member"],
      plan_meal_status: ["planned", "cooked", "replaced"],
      price_source: ["api", "receipt"],
      reaction_kind: ["favorite", "dislike", "veto", "cooked", "replaced"],
      recipe_status: ["pending_review", "approved", "rejected"],
      recipe_style: [
        "quick",
        "high_protein",
        "healthy",
        "family",
        "balanced",
        "low_calorie",
        "gut_friendly",
        "one_pot",
      ],
      recipe_visibility: ["public", "household"],
      replace_reason: [
        "dislike",
        "too_slow",
        "too_expensive",
        "repeated",
        "not_today",
      ],
      restriction_kind: ["allergy", "dislike", "diet"],
      source_platform: ["tiktok", "instagram", "youtube", "manual"],
      store_source: ["vtex", "instaleap", "manual"],
    },
  },
} as const

