import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout, AuthLayout, BusinessLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PrivateRoute } from '@/components/PrivateRoute'
import { PublicRoute } from '@/components/PublicRoute'
import { BusinessPermissionRoute } from '@/components/BusinessPermissionRoute'
import { AdminRoute } from '@/components/AdminRoute'

// ── Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// ── Main pages
import { DashboardPage } from '@/pages/DashboardPage'
import { BusinessListPage } from '@/pages/businesses/BusinessListPage'
import { BusinessNewPage } from '@/pages/businesses/BusinessNewPage'

// ── Business inner pages
import { BusinessDashboardPage } from '@/pages/businesses/BusinessDashboardPage'
import { BusinessSettingsPage } from '@/pages/businesses/BusinessSettingsPage'
import { BusinessUsersPage } from '@/pages/businesses/BusinessUsersPage'
import { BusinessInvitePage } from '@/pages/businesses/BusinessInvitePage'
import { BusinessRolesPage } from '@/pages/businesses/BusinessRolesPage'
import { RoleFormPage } from '@/pages/businesses/RoleFormPage'

// ── Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminUsersPage } from '@/pages/admin/users/AdminUsersPage'
import { AdminUserDetailPage } from './pages/admin/users/AdminUserDetailPage'
import { AdminBusinessesPage } from '@/pages/admin/business/AdminBusinessesPage'
import { AdminBusinessDetailPage } from './pages/admin/business/AdminBusinessDetailPage'

// ── Profile pages
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { SecurityPage } from '@/pages/profile/SecurityPage'

// ── Inventory pages
import { InventoryListPage } from './pages/businesses/inventory/InventoryListPage'
import { ProductDetailPage } from '@/pages/businesses/inventory/ProductDetailPage'
import { ProductFormPage } from '@/pages/businesses/inventory/ProductFormPage'
import { InventorySettingsPage } from '@/pages/businesses/inventory/InventorySettingsPage'
import { MovementsPage } from './pages/businesses/inventory/MovementsPage'

// ── Clients pages
import { ClientsListPage } from '@/pages/businesses/clients/ClientsListPage'
import { ClientFormPage } from '@/pages/businesses/clients/ClientFormPage'
import { ClientDetailPage } from '@/pages/businesses/clients/ClientDetailPage'

// ── Sales pages
import { SalesListPage } from '@/pages/businesses/sales/SalesListPage'
import { SaleDetailPage } from '@/pages/businesses/sales/SaleDetailPage'
import { SaleNewPage } from '@/pages/businesses/sales/SaleNewPage'
import { PaymentMethodsPage } from './pages/businesses/sales/PaymentMethodsPage'

// ── Portfolio pages
import { PortfolioPage } from '@/pages/businesses/portfolio/PortfolioPage'

// ── Suppliers pages
import { SuppliersListPage } from '@/pages/businesses/suppliers/SuppliersListPage'
import { SupplierFormPage } from '@/pages/businesses/suppliers/SupplerFormPage'
import { SupplierDetailPage } from '@/pages/businesses/suppliers/SupplierDetailPage'
import { NewPurchasePage } from '@/pages/businesses/suppliers/NewPurchasePage'

// ── Finances pages
import { FinancePage } from '@/pages/businesses/finances/FinancePage'
import { RegisterDetailPage } from '@/pages/businesses/finances/RegisterDetailPage'

// ── Waste pages
import { WastePage } from '@/pages/businesses/wastes/WastePage'

// ── Reports pages
import { ReportsPage } from '@/pages/businesses/reports/ReportsPage'

// ── Placeholder para módulos futuros
import { ComingSoonPage } from '@/pages/ComingSoonPage'

export const router = createBrowserRouter([
    // ─── Raíz → dashboard ───────────────────────────────────────────────────────
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },

    // ─── Rutas públicas (solo sin sesión) ────────────────────────────────────────
    {
        element: <PublicRoute />,
        children: [
            {
                element: <AuthLayout />,
                children: [
                    { path: '/login', element: <LoginPage /> },
                    { path: '/register', element: <RegisterPage /> },
                ],
            },
        ],
    },

    // ─── Rutas privadas (requieren sesión) ───────────────────────────────────────
    {
        element: <PrivateRoute />,
        children: [
            // Layout principal con sidebar global
            {
                element: <AppLayout />,
                children: [
                    { path: '/dashboard', element: <DashboardPage /> },
                    { path: '/businesses', element: <BusinessListPage /> },
                    { path: '/businesses/new', element: <BusinessNewPage /> },
                    { path: '/profile', element: <ProfilePage /> },
                    { path: '/profile/security', element: <SecurityPage /> },
                ],
            },

            // Layout de negocio con sidebar contextual
            {
                path: '/businesses/:id',
                element: <BusinessLayout />,
                children: [
                    { index: true, element: <BusinessDashboardPage /> },
                    { path: 'settings', element: <BusinessSettingsPage /> },

                    // Rutas protegidas por permisos de negocio
                    {
                        element: <BusinessPermissionRoute require="canManageUsers" />,
                        children: [
                            { path: 'users', element: <BusinessUsersPage /> },
                            { path: 'users/invite', element: <BusinessInvitePage /> },
                        ],
                    },
                    {
                        element: <BusinessPermissionRoute require="canManageRoles" />,
                        children: [
                            { path: 'roles', element: <BusinessRolesPage /> },
                            { path: 'roles/new', element: <RoleFormPage /> },
                            { path: 'roles/:roleId', element: <RoleFormPage /> },
                        ],
                    },
                    // Módulos futuros
                    { path: 'inventory', element: <InventoryListPage /> },
                    { path: 'inventory/products/new', element: <ProductFormPage /> },
                    { path: 'inventory/products/:productId', element: <ProductDetailPage /> },
                    { path: 'inventory/products/:productId/edit', element: <ProductFormPage /> },
                    { path: 'inventory/settings', element: <InventorySettingsPage /> },
                    { path: 'inventory/movements', element: <MovementsPage /> },

                    { path: 'sales', element: <SalesListPage /> },
                    { path: 'sales/new', element: <SaleNewPage /> },
                    { path: 'sales/:saleId', element: <SaleDetailPage /> },
                    { path: 'sales/:saleId/edit', element: <SaleNewPage /> },
                    { path: 'sales/payment-methods', element: <PaymentMethodsPage /> },

                    { path: 'clients', element: <ClientsListPage /> },
                    { path: 'clients/new', element: <ClientFormPage /> },
                    { path: 'clients/:clientId', element: <ClientDetailPage /> },
                    { path: 'clients/:clientId/edit', element: <ClientFormPage /> },

                    { path: 'portfolio', element: <PortfolioPage /> },

                    { path: 'suppliers', element: <SuppliersListPage /> },
                    { path: 'suppliers/new', element: <SupplierFormPage /> },
                    { path: 'suppliers/:supplierId', element: <SupplierDetailPage /> },
                    { path: 'suppliers/:supplierId/edit', element: <SupplierFormPage /> },
                    { path: 'suppliers/:supplierId/purchase', element: <NewPurchasePage /> },

                    { path: 'finance', element: <FinancePage /> },
                    { path: 'finance/registers/:registerId', element: <RegisterDetailPage /> },

                    { path: 'waste', element: <WastePage /> },
                    
                    { path: 'reports', element: <ReportsPage /> },
                ],
            },
        ],
    },

    // ─── Rutas de administración (super_admin, admin, support) ───────────────────
    {
        element: <AdminRoute />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    { path: '/admin', element: <AdminDashboardPage /> },
                    { path: '/admin/audit-logs', element: <AdminAuditLogsPage /> },
                    { path: '/admin/settings', element: <AdminSettingsPage /> },
                    { path: '/admin/users', element: <AdminUsersPage /> },
                    { path: '/admin/users/:id', element: <AdminUserDetailPage /> },
                    { path: '/admin/businesses', element: <AdminBusinessesPage /> },
                    { path: '/admin/businesses/:id', element: <AdminBusinessDetailPage /> },
                ],
            },
        ],
    },

    // ─── 404 ─────────────────────────────────────────────────────────────────────
    {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
    },
])