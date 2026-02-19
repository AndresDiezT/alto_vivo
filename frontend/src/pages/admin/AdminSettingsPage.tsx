import React from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useSystemSettings, useBulkUpdateSettings } from '@/hooks/admin/useSystemSettings'
import { PageLoader } from '@/components/ui'
import type { SystemSetting } from '@/api/admin/settings'

const GROUP_LABELS: Record<string, string> = {
    general: 'General',
    limits: 'Límites por plan',
    features: 'Funcionalidades',
}

export function AdminSettingsPage() {
    const { data: settings, isLoading } = useSystemSettings()
    const bulkUpdate = useBulkUpdateSettings()

    // Estado local: solo los valores editados
    const [draft, setDraft] = React.useState<Record<string, string>>({})
    const isDirty = Object.keys(draft).length > 0

    // Inicializa draft cuando llega la data
    React.useEffect(() => {
        if (settings) {
            const initial: Record<string, string> = {}
            settings.forEach((s) => { initial[s.key] = s.value })
            setDraft(initial)
        }
    }, [settings])

    const handleChange = (key: string, value: string) => {
        setDraft((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = () => {
        if (!settings) return
        // Solo envía los que cambiaron
        const changed: Record<string, string> = {}
        settings.forEach((s) => {
            if (draft[s.key] !== s.value) changed[s.key] = draft[s.key]
        })
        if (Object.keys(changed).length > 0) {
            bulkUpdate.mutate(changed)
        }
    }

    if (isLoading) return <PageLoader />
    if (!settings) return null

    // Agrupar
    const grouped = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
        if (!acc[s.group]) acc[s.group] = []
        acc[s.group].push(s)
        return acc
    }, {})

    // Detectar si algo cambió respecto al original
    const hasChanges = settings.some((s) => draft[s.key] !== s.value)

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Configuración del sistema</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Solo super_admin puede modificar estos valores
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || bulkUpdate.isPending}
                    className="btn-primary btn-sm flex items-center gap-2 disabled:opacity-50"
                >
                    {bulkUpdate.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Save className="w-4 h-4" />
                    }
                    Guardar cambios
                </button>
            </div>

            {bulkUpdate.isSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                    Configuración guardada correctamente
                </div>
            )}

            <div className="space-y-6">
                {Object.entries(grouped).map(([group, items]) => (
                    <div key={group} className="card p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">
                            {GROUP_LABELS[group] ?? group}
                        </h2>
                        <div className="space-y-5">
                            {items.map((setting) => (
                                <SettingRow
                                    key={setting.key}
                                    setting={setting}
                                    value={draft[setting.key] ?? setting.value}
                                    onChange={(v) => handleChange(setting.key, v)}
                                    dirty={draft[setting.key] !== setting.value}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SettingRow({
    setting,
    value,
    onChange,
    dirty,
}: {
    setting: SystemSetting
    value: string
    onChange: (v: string) => void
    dirty: boolean
}) {
    return (
        <div className={`flex items-start justify-between gap-4 ${dirty ? 'opacity-100' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{setting.label}</p>
                    {dirty && (
                        <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                            modificado
                        </span>
                    )}
                </div>
                {setting.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                )}
                <p className="text-xs text-gray-400 font-mono mt-0.5">{setting.key}</p>
            </div>

            <div className="flex-shrink-0">
                {setting.value_type === 'bool' ? (
                    <button
                        onClick={() => onChange(value === 'true' ? 'false' : 'true')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value === 'true' ? 'bg-brand-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                ) : (
                    <input
                        type={setting.value_type === 'int' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="input w-32 text-right"
                    />
                )}
            </div>
        </div>
    )
}