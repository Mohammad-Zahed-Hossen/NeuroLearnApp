export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workout_logs: {
        Row: {
          id: string
          user_id: string
          workout_type: string
          duration: number
          intensity: number
          notes: string | null
          date: string
          created_at: string
          calories_burned: number | null
        }
        Insert: {
          id?: string
          user_id: string
          workout_type: string
          duration: number
          intensity: number
          notes?: string | null
          date?: string
          created_at?: string
          calories_burned?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          workout_type?: string
          duration?: number
          intensity?: number
          notes?: string | null
          date?: string
          created_at?: string
          calories_burned?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
