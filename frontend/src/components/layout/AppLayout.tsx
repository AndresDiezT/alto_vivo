import React from 'react'
import { Outlet, NavLink, useParams, Link } from 'react-router-dom'
import {
  LayoutDashboard, Building2, User, LogOut,
  Package, DollarSign, Users, FileText, Landmark, Truck,
  BarChart3, Trash2, Settings, Shield, UserCog, ChevronDown,
  Menu,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { useBusinessPermissions } from '@/hooks/useBusinessPermissions'
import { Avatar } from '@/components/ui'
import { cn } from '@/utils'
import { PLAN_LABELS } from '@/utils'
import type { Business } from '@/types'

// ── Top Navbar ─────────────────────────────────────────────────────────────────
function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuthStore()
  const logout = useLogout()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Mobile menu + Logo */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-surface-50 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-brand-600 to-brand-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight hidden sm:inline">AltoVivo</span>
        </Link>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 sm:gap-2.5 hover:bg-surface-50 rounded-xl px-2 sm:px-2.5 py-1.5 transition-colors"
        >
          <Avatar name={user?.full_name ?? user?.username ?? null} size="sm" />
          <div className="text-left hidden md:block">
            <p className="text-xs font-medium text-gray-800 leading-tight">
              {user?.full_name ?? user?.username}
            </p>
            <p className="text-[11px] text-gray-400 capitalize">
              {PLAN_LABELS[user?.subscription_plan ?? 'free']}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-100 shadow-modal z-20 py-1 animate-scale-in">
              {(user?.system_role === 'super_admin' || user?.system_role === 'admin' || user?.system_role === 'support') && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-surface-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-gray-400" />
                    Panel de administración
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                </>
              )}
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-surface-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-400" />
                Mi perfil
              </Link>
              <Link
                to="/profile/security"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-surface-50 transition-colors"
              >
                <Shield className="w-4 h-4 text-gray-400" />
                Seguridad
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

// ── Sidebar genérico (sin negocio) ─────────────────────────────────────────────
function GlobalSidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-56 bg-white border-r border-gray-100 flex flex-col py-4
          transform transition-transform duration-200 lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <nav className="flex-1 px-3 space-y-0.5">
          <SidebarLink to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Inicio" onClick={onClose} />
          <SidebarLink to="/businesses" icon={<Building2 className="w-4 h-4" />} label="Mis negocios" onClick={onClose} />
          <SidebarLink to="/profile" icon={<User className="w-4 h-4" />} label="Perfil" onClick={onClose} />
        </nav>
      </aside>
    </>
  )
}

// ── Sidebar negocio ────────────────────────────────────────────────────────────
function BusinessSidebar({ business, isOpen, onClose }: { business: Business; isOpen?: boolean; onClose?: () => void }) {
  const { id } = useParams()
  const businessId = Number(id)
  const { isLoading: loadingPerms, ...permissions } = useBusinessPermissions(businessId)
  const base = `/businesses/${id}`

  const modules = [
    {
      to: `${base}/inventory`,
      icon: <Package className="w-4 h-4" />,
      label: 'Inventario',
      enabled: business.module_inventory,
      visible: permissions.isOwner || permissions.hasPermission('inventory.view'),
    },
    {
      to: `${base}/sales`,
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Ventas',
      enabled: business.module_sales,
      visible: permissions.isOwner || permissions.hasPermission('sales.view'),
    },
    {
      to: `${base}/clients`,
      icon: <Users className="w-4 h-4" />,
      label: 'Clientes',
      enabled: business.module_clients,
      visible: permissions.isOwner || permissions.hasPermission('clients.view'),
    },
    {
      to: `${base}/portfolio`,
      icon: <FileText className="w-4 h-4" />,
      label: 'Cartera',
      enabled: business.module_portfolio,
      visible: permissions.isOwner || permissions.hasPermission('portfolio.view'),
    },
    {
      to: `${base}/finance`,
      icon: <Landmark className="w-4 h-4" />,
      label: 'Finanzas',
      enabled: business.module_finance,
      visible: permissions.isOwner || permissions.hasPermission('finance.view'),
    },
    {
      to: `${base}/suppliers`,
      icon: <Truck className="w-4 h-4" />,
      label: 'Proveedores',
      enabled: business.module_suppliers,
      visible: permissions.isOwner || permissions.hasPermission('suppliers.view'),
    },
    {
      to: `${base}/reports`,
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Reportes',
      enabled: business.module_reports,
      visible: permissions.isOwner || permissions.hasPermission('reports.view'),
    },
    {
      to: `${base}/waste`,
      icon: <Trash2 className="w-4 h-4" />,
      label: 'Mermas',
      enabled: business.module_waste,
      visible: permissions.isOwner || permissions.hasPermission('waste.view'),
    },
  ];

  const showUsersOption = !loadingPerms && (permissions.isOwner || permissions.canManageUsers)
  const showRolesOption = !loadingPerms && (permissions.isOwner || permissions.canManageRoles)
  const showSettingsOption = !loadingPerms && permissions.isOwner
  const showAdminSection = showUsersOption || showRolesOption || showSettingsOption

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-56 bg-white border-r border-gray-100 flex flex-col py-4 overflow-y-auto
        transform transition-transform duration-200 lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-3 mb-3">
          <Link to="/businesses" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>
            ← Mis negocios
          </Link>
          <p className="text-xs font-semibold text-gray-900 mt-2 truncate">{business.name}</p>
          <span className="text-[11px] text-gray-400 capitalize">{business.plan_type}</span>
        </div>
        <div className="h-px bg-gray-100 mx-3 mb-3" />

        <nav className="flex-1 px-3 space-y-0.5">
          <SidebarLink to={base} icon={<LayoutDashboard className="w-4 h-4" />} label="Resumen Negocio" onClick={onClose} />
          <div className="h-px bg-gray-100 my-2" />

          <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider px-2 mb-1">Módulos</p>
          {modules
            .filter(m => m.visible)
            .map(m => m.enabled
              ? <SidebarLink key={m.to} to={m.to} icon={m.icon} label={m.label} onClick={onClose} />
              : <DisabledSidebarLink key={m.to} icon={m.icon} label={m.label} />
            )}

          {/* Sección admin — no renderizar hasta tener permisos cargados */}
          {loadingPerms ? (
            // Skeleton sutil mientras carga
            <div className="mt-3 space-y-1.5 px-2">
              <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-7 bg-gray-50 rounded-xl animate-pulse" />
              <div className="h-7 bg-gray-50 rounded-xl animate-pulse" />
            </div>
          ) : showAdminSection && (
            <>
              <div className="h-px bg-gray-100 my-2" />
              <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider px-2 mb-1">Administración</p>
              {showUsersOption && <SidebarLink to={`${base}/users`} icon={<UserCog className="w-4 h-4" />} label="Usuarios" onClick={onClose} />}
              {showRolesOption && <SidebarLink to={`${base}/roles`} icon={<Shield className="w-4 h-4" />} label="Roles" onClick={onClose} />}
              {showSettingsOption && <SidebarLink to={`${base}/settings`} icon={<Settings className="w-4 h-4" />} label="Configuración" onClick={onClose} />}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}

// ── SidebarLink ────────────────────────────────────────────────────────────────
function SidebarLink({
  to,
  icon,
  label,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150',
          isActive
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'text-gray-600 hover:bg-surface-50 hover:text-gray-900'
        )
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function DisabledSidebarLink({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-gray-300 cursor-not-allowed">
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">Pro</span>
    </div>
  )
}

// ── AppLayout ──────────────────────────────────────────────────────────────────
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="flex flex-col h-screen bg-surface-50">
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <GlobalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── BusinessLayout ─────────────────────────────────────────────────────────────
export function BusinessLayout() {
  const { id } = useParams<{ id: string }>()
  const { data: business, isLoading } = useBusiness(Number(id))
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-surface-50">
        <TopNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-5 h-5 spinner rounded-full" />
        </div>
      </div>
    )
  }

  if (!business) return null

  return (
    <div className="flex flex-col h-screen bg-surface-50">
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <BusinessSidebar
          business={business}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── AuthLayout (sin sidebar) ──────────────────────────────────────────────────
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">AltoVivo</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestiona todos tus negocios desde un solo lugar
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Inventario, ventas, clientes, cartera y más — todo centralizado y en tiempo real.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            {['Inventario', 'Ventas', 'Clientes', 'Cartera', 'Reportes'].map((m) => (
              <span
                key={m}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm backdrop-blur"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <p className="text-brand-400 text-sm">© 2025 AltoVivo. Todos los derechos reservados.</p>
      </div>

      {/* Panel derecho con el form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}