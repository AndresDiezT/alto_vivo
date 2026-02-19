// ─── Auth ──────────────────────────────────────────────────────────────────

export interface TokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
}

// ─── User ──────────────────────────────────────────────────────────────────

export type SystemRole = 'super_admin' | 'admin' | 'user' | 'support'
export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise'

export interface User {
    id: number
    email: string
    username: string
    full_name: string | null
    phone: string | null
    system_role: SystemRole
    subscription_plan: SubscriptionPlan
    is_active: boolean
    is_verified: boolean
    created_at: string
}

// ─── Business ──────────────────────────────────────────────────────────────

export type BusinessType = 'retail' | 'restaurant' | 'wholesale' | 'other'
export type PlanType = 'free' | 'basic' | 'professional' | 'enterprise'

export interface Business {
    id: number
    name: string
    description: string | null
    business_type: BusinessType
    plan_type: PlanType
    max_users: number
    max_products: number
    owner_id: number
    is_active: boolean
    created_at: string
    module_inventory: boolean
    module_sales: boolean
    module_clients: boolean
    module_portfolio: boolean
    module_finance: boolean
    module_suppliers: boolean
    module_reports: boolean
    module_waste: boolean
}

export interface BusinessUserResponse {
    id: number
    user_id: number
    user_email: string
    user_name: string
    role_id: number | null
    role_name: string | null
    is_active: boolean
    joined_at: string
    can_manage_users?: boolean
    can_manage_roles?: boolean
    permissions?: string[]
}

// ─── Roles & Permissions ───────────────────────────────────────────────────

export interface Permission {
    id: number
    code: string
    name: string
    module: string
    description: string | null
}

export interface BusinessRole {
    id: number
    business_id: number
    name: string
    description: string | null
    is_default: boolean
    can_manage_users: boolean
    can_manage_roles: boolean
    permissions: Permission[]
    created_at: string
}

// Permisos agrupados por módulo que devuelve el backend
export type PermissionsGrouped = Record<string, { id: number; code: string; name: string }[]>

// ─── Forms ────────────────────────────────────────────────────────────────

export interface LoginForm {
    email: string
    password: string
}

export interface RegisterForm {
    email: string
    username: string
    password: string
    confirm_password: string
    full_name: string
    phone?: string
}

export interface BusinessCreateForm {
    name: string
    description?: string
    business_type: BusinessType
    plan_type: PlanType
}

export interface InviteUserForm {
    user_email: string
    business_role_id: string
}

export interface InviteUserFormInput {
    user_email: string
    business_role_id: string
}

export interface RoleForm {
    name: string
    description?: string
    permission_codes: string[]
    can_manage_users: boolean
    can_manage_roles: boolean
}

export interface ChangePasswordForm {
    current_password: string
    new_password: string
    confirm_new_password: string
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type ProductStatus = 'active' | 'inactive'
export type MovementTypeInventory = 'entry' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'waste'

export interface ProductCategory {
  id: number
  business_id: number
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
}

export interface Warehouse {
  id: number
  business_id: number
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface StockResponse {
  warehouse_id: number
  warehouse_name: string
  quantity: string
}

export interface ProductLot {
  id: number
  presentation_id: number
  warehouse_id: number
  lot_number: string | null
  quantity: string
  remaining: string
  cost_per_unit: string | null
  arrival_date: string
  expiry_date: string | null
  is_expired: boolean
  days_to_expiry: number | null
  is_active: boolean
}

export interface ProductPresentation {
  id: number
  product_id: number
  name: string
  barcode: string | null
  sale_price: number
  min_stock: number
  is_active: boolean
  stock: StockResponse[]
}

export interface Product {
  id: number
  business_id: number
  name: string
  description: string | null
  category_id: number | null
  category: ProductCategory | null
  is_perishable: boolean
  status: ProductStatus
  is_active: boolean
  presentations: ProductPresentation[]
  created_at: string
}

export interface InventoryMovement {
  id: number
  presentation_id: number
  warehouse_id: number
  movement_type: MovementTypeInventory
  quantity: string
  cost_per_unit: string | null
  reason: string | null
  destination_warehouse_id: number | null
  reference_type: string | null
  created_by: number
  created_at: string
}

export interface LowStockAlert {
  product_id: number
  product_name: string
  presentation_id: number
  presentation_name: string
  warehouse_id: number
  warehouse_name: string
  current_stock: string
  min_stock: number
}

export interface ExpiryAlert {
  product_id: number
  product_name: string
  presentation_id: number
  presentation_name: string
  lot_id: number
  lot_number: string | null
  expiry_date: string
  days_to_expiry: number
  remaining: string
}

// ─── Inventory Forms ──────────────────────────────────────────────────────────

export interface CategoryForm {
  name: string
  description?: string
  color: string
}

export interface WarehouseForm {
  name: string
  description?: string
  is_default: boolean
}

export interface PresentationForm {
  name: string
  barcode?: string
  sale_price: number
  min_stock: number
}

export interface ProductForm {
  name: string
  description?: string
  category_id?: number
  is_perishable: boolean
  presentations: PresentationForm[]
}

export interface EntryForm {
  presentation_id: number
  warehouse_id: number
  quantity: number
  cost_per_unit?: number
  lot_number?: string
  arrival_date?: string
  expiry_date?: string
  reason?: string
}

export interface AdjustmentForm {
  presentation_id: number
  warehouse_id: number
  quantity: number
  reason: string
}

export interface TransferForm {
  presentation_id: number
  from_warehouse_id: number
  to_warehouse_id: number
  quantity: number
  reason?: string
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'moroso' | 'blocked'
export type ClientType = 'natural' | 'empresa'
export type MovementTypeClient = 'charge' | 'payment'

export interface Client {
  id: number
  business_id: number
  name: string
  client_type: ClientType
  phone: string | null
  email: string | null
  address: string | null
  document_id: string | null
  notes: string | null
  credit_limit: string
  current_balance: string
  credit_days: number
  status: ClientStatus
  is_active: boolean
  created_at: string
  last_purchase_at: string | null
}

export interface ClientStats {
  total_purchases: number
  total_spent: string
  average_ticket: string
  credit_purchases: number
  current_balance: string
  credit_limit: string
  available_credit: string
  days_since_last_purchase: number | null
  most_bought_payment_method: string | null
}

export interface ClientPurchaseResponse {
  id: number
  total: string
  payment_method: string | null
  is_credit: boolean
  notes: string | null
  created_at: string
}

export interface CreditMovement {
  id: number
  client_id: number
  amount: string
  movement_type: MovementTypeClient
  description: string | null
  created_by: number | null
  created_at: string
}

// ─── Forms Clients ────────────────────────────────────────────────────────────────────

export interface ClientForm {
  name: string
  client_type: ClientType
  phone?: string
  email?: string
  address?: string
  document_id?: string
  notes?: string
  credit_limit: string
  credit_days: number
}

export interface CreditMovementForm {
  amount: string
  movement_type: MovementTypeClient
  description?: string
}

// ─── Portfolio ──────────────────────────────────────────────────────────────

export interface PortfolioSummary {
  total_clients_with_debt: number
  total_portfolio: string
  total_overdue: string
  morosos_count: number
  collected_last_30_days: string
}

export interface PortfolioMovement {
  id: number
  client_id: number
  client_name: string | null
  amount: string
  movement_type: 'charge' | 'payment'
  description: string | null
  created_at: string
}

// ─── API Errors ───────────────────────────────────────────────────────────

export interface ApiError {
    detail: string | { msg: string; type: string }[]
}