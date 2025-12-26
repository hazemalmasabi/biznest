export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            branches: {
                Row: {
                    address: string | null
                    business_id: string
                    created_at: string
                    id: string
                    is_main: boolean | null
                    name: string
                    phone: string | null
                }
                Insert: {
                    address?: string | null
                    business_id: string
                    created_at?: string
                    id?: string
                    is_main?: boolean | null
                    name: string
                    phone?: string | null
                }
                Update: {
                    address?: string | null
                    business_id?: string
                    created_at?: string
                    id?: string
                    is_main?: boolean | null
                    name?: string
                    phone?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "branches_business_id_fkey"
                        columns: ["business_id"]
                        isOneToOne: false
                        referencedRelation: "businesses"
                        referencedColumns: ["id"]
                    },
                ]
            }
            business_members: {
                Row: {
                    business_id: string
                    created_at: string
                    id: string
                    role: Database["public"]["Enums"]["business_role"]
                    user_id: string
                }
                Insert: {
                    business_id: string
                    created_at?: string
                    id?: string
                    role?: Database["public"]["Enums"]["business_role"]
                    user_id: string
                }
                Update: {
                    business_id?: string
                    created_at?: string
                    id?: string
                    role?: Database["public"]["Enums"]["business_role"]
                    user_id: string
                }
                Relationships: [
                    {
                        foreignKeyName: "business_members_business_id_fkey"
                        columns: ["business_id"]
                        isOneToOne: false
                        referencedRelation: "businesses"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "business_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            businesses: {
                Row: {
                    created_at: string
                    id: string
                    name: string
                    slug: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    name: string
                    slug?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    name?: string
                    slug?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    full_name: string | null
                    id: string
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id: string
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            business_role: "owner" | "admin" | "staff"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
