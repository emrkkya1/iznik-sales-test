export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          username: string;
          role: 'admin' | 'staff';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          username: string;
          role: 'admin' | 'staff';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          username?: string;
          role?: 'admin' | 'staff';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      districts: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          city_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          city_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'districts_city_id_fkey';
            columns: ['city_id'];
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          }
        ];
      };
      branches: {
        Row: {
          id: string;
          district_id: string;
          name: string;
          current_balance: number;
          opening_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          district_id: string;
          name: string;
          current_balance?: number;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          district_id?: string;
          name?: string;
          current_balance?: number;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branches_district_id_fkey';
            columns: ['district_id'];
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          name: string;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      branch_products: {
        Row: {
          id: string;
          branch_id: string;
          product_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          product_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          branch_id?: string;
          product_id?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_products_branch_id_fkey';
            columns: ['branch_id'];
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_products_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ];
      };
      branch_product_prices: {
        Row: {
          id: string;
          branch_product_id: string;
          price: number;
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          branch_product_id: string;
          price: number;
          start_date: string;
          end_date?: string | null;
          created_at?: string;
        };
        Update: {
          branch_product_id?: string;
          price?: number;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_product_prices_branch_product_id_fkey';
            columns: ['branch_product_id'];
            referencedRelation: 'branch_products';
            referencedColumns: ['id'];
          }
        ];
      };
      deliveries: {
        Row: {
          id: string;
          branch_id: string;
          user_id: string;
          total_sales_amount: number;
          date: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          user_id: string;
          total_sales_amount: number;
          date: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          user_id?: string;
          total_sales_amount?: number;
          date?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deliveries_branch_id_fkey';
            columns: ['branch_id'];
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deliveries_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          product_id: string;
          delivered_quantity: number;
          returned_quantity: number;
          net_quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          product_id: string;
          delivered_quantity: number;
          returned_quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          delivery_id?: string;
          product_id?: string;
          delivered_quantity?: number;
          returned_quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_items_delivery_id_fkey';
            columns: ['delivery_id'];
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          branch_id: string;
          user_id: string;
          delivery_id: string | null;
          amount: number;
          payment_type: 'field_collection' | 'bank_transfer';
          date: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          user_id: string;
          delivery_id?: string | null;
          amount: number;
          payment_type: 'field_collection' | 'bank_transfer';
          date: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          created_at?: string;
        };
        Update: {
          branch_id?: string;
          user_id?: string;
          delivery_id?: string | null;
          amount?: number;
          payment_type?: 'field_collection' | 'bank_transfer';
          date?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_branch_id_fkey';
            columns: ['branch_id'];
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_delivery_id_fkey';
            columns: ['delivery_id'];
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          operation_type: string;
          table_name: string;
          record_id: string;
          user_id: string;
          old_data: Json | null;
          deletion_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operation_type: string;
          table_name: string;
          record_id: string;
          user_id: string;
          old_data?: Json | null;
          deletion_reason?: string | null;
          created_at?: string;
        };
        Update: {
          operation_type?: string;
          table_name?: string;
          record_id?: string;
          user_id?: string;
          old_data?: Json | null;
          deletion_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      log_audit: {
        Args: {
          p_operation_type: string;
          p_table_name: string;
          p_record_id: string;
          p_old_data?: Json | null;
          p_deletion_reason?: string | null;
        };
        Returns: undefined;
      };
      get_effective_price: {
        Args: {
          p_branch_product_id: string;
          p_date: string;
        };
        Returns: number;
      };
      recalculate_branch_balance: {
        Args: {
          p_branch_id: string;
        };
        Returns: number;
      };
      create_delivery_atomic: {
        Args: {
          p_branch_id: string;
          p_items: Json;
          p_payment_amount: number;
          p_payment_type: string;
          p_date: string;
        };
        Returns: string;
      };
      update_delivery_atomic: {
        Args: {
          p_delivery_id: string;
          p_items: Json;
          p_date: string;
        };
        Returns: undefined;
      };
      soft_delete_delivery_atomic: {
        Args: {
          p_delivery_id: string;
          p_deletion_reason: string;
        };
        Returns: undefined;
      };
      record_manual_payment_atomic: {
        Args: {
          p_branch_id: string;
          p_amount: number;
          p_payment_type: string;
          p_date: string;
        };
        Returns: string;
      };
      get_branch_balance: {
        Args: {
          p_branch_id: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
