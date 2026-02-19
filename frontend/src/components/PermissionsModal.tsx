import React from 'react'
import { Modal } from '@/components/ui'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSave: (codes: string[]) => void
    permissions: Record<string, { id: number; code: string; name: string }[]>
    selectedCodes: string[]
}

const MODULE_ICONS: Record<string, string> = {
    inventory: '📦', sales: '💰', clients: '👥', portfolio: '📋',
    finance: '🏦', suppliers: '🚚', reports: '📊', waste: '🗑️',
    users: '👤', roles: '🔐',
}

const MODULE_NAMES: Record<string, string> = {
    inventory: 'Inventario', sales: 'Ventas', clients: 'Clientes',
    portfolio: 'Cartera', finance: 'Finanzas', suppliers: 'Proveedores',
    reports: 'Reportes', waste: 'Mermas', users: 'Usuarios', roles: 'Roles',
}

const VIEW_DEPENDENCIES: Record<string, string> = {
    'inventory.create': 'inventory.view',
    'inventory.update': 'inventory.view',
    'inventory.delete': 'inventory.view',
    'inventory.adjust': 'inventory.view',
    'inventory.report': 'inventory.view',
    'sales.create': 'sales.view',
    'sales.cancel': 'sales.view',
    'sales.report': 'sales.view',
    'clients.create': 'clients.view',
    'clients.update': 'clients.view',
    'clients.delete': 'clients.view',
    'portfolio.collect': 'portfolio.view',
    'portfolio.adjust': 'portfolio.view',
    'portfolio.report': 'portfolio.view',
    'finance.create': 'finance.view',
    'finance.update': 'finance.view',
    'finance.report': 'finance.view',
    'suppliers.create': 'suppliers.view',
    'suppliers.update': 'suppliers.view',
    'suppliers.delete': 'suppliers.view',
    'waste.register': 'waste.view',
    'waste.report': 'waste.view',
}

export function PermissionsModal({ isOpen, onClose, onSave, permissions, selectedCodes }: Props) {
    const [tempCodes, setTempCodes] = React.useState<string[]>(selectedCodes)

    // Sincronizar cuando se abre el modal
    React.useEffect(() => {
        if (isOpen) {
            setTempCodes(selectedCodes)
        }
    }, [isOpen, selectedCodes])

    const togglePermission = (code: string) => {
        setTempCodes((prev) => {
            if (prev.includes(code)) {
                // Al desmarcar un .view, desmarcar todo el módulo que depende de él
                const dependents = Object.entries(VIEW_DEPENDENCIES)
                    .filter(([, viewCode]) => viewCode === code)
                    .map(([depCode]) => depCode)
                return prev.filter((c) => c !== code && !dependents.includes(c))
            } else {
                // Al marcar cualquier permiso, agregar su .view si aplica
                const requiredView = VIEW_DEPENDENCIES[code]
                return requiredView
                    ? [...new Set([...prev, code, requiredView])]
                    : [...prev, code]
            }
        })
    }

    const toggleModule = (moduleCodes: string[]) => {
        const allSelected = moduleCodes.every((c) => tempCodes.includes(c))
        if (allSelected) {
            setTempCodes((prev) => prev.filter((c) => !moduleCodes.includes(c)))
        } else {
            // Agregar todos + sus dependencias view
            const withDeps = moduleCodes.reduce<string[]>((acc, code) => {
                const view = VIEW_DEPENDENCIES[code]
                return view ? [...acc, code, view] : [...acc, code]
            }, [])
            setTempCodes((prev) => [...new Set([...prev, ...withDeps])])
        }
    }

    const handleSave = () => {
        onSave(tempCodes)
        onClose()
    }

    const handleSelectAll = () => {
        const all = Object.values(permissions).flat().map((p) => p.code)
        setTempCodes(all)
    }

    const handleClear = () => {
        setTempCodes([])
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar permisos" size="lg">
            <div className="space-y-5">
                {/* Header actions */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <p className="text-sm text-gray-600">
                        {tempCodes.length} permisos seleccionados
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="text-xs text-brand-600 hover:underline cursor-pointer"
                            onClick={handleSelectAll}
                        >
                            Seleccionar todo
                        </button>
                        <span className="text-gray-200">·</span>
                        <button
                            type="button"
                            className="text-xs text-gray-500 hover:underline cursor-pointer"
                            onClick={handleClear}
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* Modules list */}
                <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-2">
                    {Object.entries(permissions).map(([module, perms]) => {
                        const moduleCodes = perms.map((p) => p.code)
                        const allSelected = moduleCodes.every((c) => tempCodes.includes(c))
                        const someSelected = moduleCodes.some((c) => tempCodes.includes(c))

                        return (
                            <div key={module}>
                                {/* Module header */}
                                <button
                                    type="button"
                                    onClick={() => toggleModule(moduleCodes)}
                                    className="flex items-center gap-2.5 w-full text-left mb-3 group"
                                >
                                    <div
                                        className={`w-4 h-4 rounded border-2 transition-all ${allSelected
                                            ? 'bg-brand-600 border-brand-600'
                                            : someSelected
                                                ? 'bg-brand-200 border-brand-400'
                                                : 'border-gray-300 group-hover:border-brand-400'
                                            }`}
                                    >
                                        {allSelected && (
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="none">
                                                <path
                                                    d="M3 8l3.5 3.5 6.5-7"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">
                                        {MODULE_ICONS[module] ?? '🔧'} {MODULE_NAMES[module] ?? module}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {moduleCodes.filter((c) => tempCodes.includes(c)).length}/{moduleCodes.length}
                                    </span>
                                </button>

                                {/* Permissions grid */}
                                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {perms.map((p) => (
                                        <label
                                            key={p.code}
                                            className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-surface-50 transition-colors group"
                                        >
                                            <div
                                                className={`w-3.5 h-3.5 rounded border-2 transition-all ${tempCodes.includes(p.code)
                                                    ? 'bg-brand-600 border-brand-600'
                                                    : 'border-gray-300 group-hover:border-brand-400'
                                                    }`}
                                                onClick={() => togglePermission(p.code)}
                                            />
                                            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">
                                                {p.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-1">
                        Guardar permisos
                    </button>
                </div>
            </div>
        </Modal>
    )
}