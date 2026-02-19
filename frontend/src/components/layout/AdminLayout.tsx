import React from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import {
    LayoutDashboard, Users, Building2, FileText, Settings, LogOut,
    Shield, Menu, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui'
import { cn } from '@/utils'

function AdminTopNav({ onMenuClick }: { onMenuClick: () => void }) {
    const { user } = useAuthStore()
    const logout = useLogout()
    const [open, setOpen] = React.useState(false)

    return (
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
            {/* Mobile menu + Logo */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5 text-gray-300" />
                </button>
                <Link to="/admin" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-white text-sm tracking-tight hidden sm:inline">
                        Admin Panel
                    </span>
                </Link>
            </div>

            {/* User menu */}
            <div className="relative">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-2 sm:gap-2.5 hover:bg-gray-800 rounded-xl px-2 sm:px-2.5 py-1.5 transition-colors"
                >
                    <Avatar name={user?.full_name ?? user?.username ?? null} size="sm" />
                    <div className="text-left hidden md:block">
                        <p className="text-xs font-medium text-gray-100 leading-tight">
                            {user?.full_name ?? user?.username}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">{user?.system_role}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>

                {open && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-100 shadow-modal z-20 py-1 animate-scale-in">
                            <Link
                                to="/dashboard"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-surface-50 transition-colors"
                            >
                                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                                Volver a mi cuenta
                            </Link>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                                onClick={() => {
                                    setOpen(false)
                                    logout()
                                }}
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

function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user } = useAuthStore()
    const isSuperAdmin = user?.system_role === 'super_admin'

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-4
          transform transition-transform duration-200 lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <nav className="flex-1 px-3 space-y-0.5">
                    <AdminNavLink
                        to="/admin"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        label="Dashboard"
                        onClick={onClose}
                    />
                    <AdminNavLink
                        to="/admin/users"
                        icon={<Users className="w-4 h-4" />}
                        label="Usuarios"
                        onClick={onClose}
                    />
                    <AdminNavLink
                        to="/admin/businesses"
                        icon={<Building2 className="w-4 h-4" />}
                        label="Negocios"
                        onClick={onClose}
                    />
                    <AdminNavLink
                        to="/admin/audit-logs"
                        icon={<FileText className="w-4 h-4" />}
                        label="Logs"
                        onClick={onClose}
                    />
                    {isSuperAdmin && (
                        <AdminNavLink
                            to="/admin/settings"
                            icon={<Settings className="w-4 h-4" />}
                            label="Configuración"
                            onClick={onClose}
                        />
                    )}
                </nav>

                <div className="px-3 pt-3 border-t border-gray-800">
                    <Link
                        to="/dashboard"
                        onClick={onClose}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        ← Volver a mi cuenta
                    </Link>
                </div>
            </aside>
        </>
    )
}

function AdminNavLink({
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
            end={to === '/admin'}
            onClick={onClick}
            className={({ isActive }) =>
                cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150',
                    isActive
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                )
            }
        >
            <span className="flex-shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </NavLink>
    )
}

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = React.useState(false)

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <AdminTopNav onMenuClick={() => setSidebarOpen(true)} />
            <div className="flex flex-1 overflow-hidden relative">
                <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 overflow-y-auto bg-gray-100">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}