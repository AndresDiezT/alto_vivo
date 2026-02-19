import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useCreateBusiness } from '@/hooks/useBusiness'
import { useAuthStore } from '@/store/authStore'
import {
    InputField, TextareaField, SelectField, ErrorAlert, Spinner,
} from '@/components/ui'
import { getApiErrorMessage, MODULE_LABELS, PLAN_LABELS } from '@/utils'
import type { SubscriptionPlan } from '@/types'

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    description: z.string().optional(),
    business_type: z.enum(['retail', 'restaurant', 'wholesale', 'other']),
})

type FormData = z.infer<typeof schema>

// Módulos disponibles por plan (del usuario)
const PLAN_MODULES: Record<SubscriptionPlan, Record<string, boolean>> = {
    free: { module_inventory: true, module_sales: true, module_clients: true, module_portfolio: true, module_finance: false, module_suppliers: false, module_reports: false, module_waste: false },
    basic: { module_inventory: true, module_sales: true, module_clients: true, module_portfolio: true, module_finance: true, module_suppliers: true, module_reports: false, module_waste: false },
    professional: { module_inventory: true, module_sales: true, module_clients: true, module_portfolio: true, module_finance: true, module_suppliers: true, module_reports: true, module_waste: true },
    enterprise: { module_inventory: true, module_sales: true, module_clients: true, module_portfolio: true, module_finance: true, module_suppliers: true, module_reports: true, module_waste: true },
}

export function BusinessNewPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const { mutate, isPending, error } = useCreateBusiness()

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { business_type: 'retail' },
    })

    const userPlan = user?.subscription_plan ?? 'free'
    const modules = PLAN_MODULES[userPlan]

    const onSubmit = (data: FormData) => {
        // El backend usa el plan del usuario para configurar módulos
        const payload = { ...data, plan_type: userPlan }
        mutate(payload as any, { onSuccess: (b) => navigate(`/businesses/${b.id}`) })
    }

    return (
        <div className="p-8 max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link to="/businesses" className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Crear negocio</h1>
                    <p className="text-sm text-gray-500">Configura tu nuevo negocio</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                {/* Form */}
                <div className="lg:col-span-3">
                    <div className="card p-6">
                        {error && <div className="mb-4"><ErrorAlert message={getApiErrorMessage(error)} /></div>}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <InputField
                                label="Nombre del negocio"
                                placeholder="Ej: Tienda La Esperanza"
                                error={errors.name?.message}
                                required
                                {...register('name')}
                            />

                            <TextareaField
                                label="Descripción"
                                placeholder="¿A qué se dedica este negocio?"
                                {...register('description')}
                            />

                            <SelectField
                                label="Tipo de negocio"
                                error={errors.business_type?.message}
                                options={[
                                    { value: 'retail', label: 'Minorista / Tienda' },
                                    { value: 'restaurant', label: 'Restaurante / Comidas' },
                                    { value: 'wholesale', label: 'Mayorista' },
                                    { value: 'other', label: 'Otro' },
                                ]}
                                {...register('business_type')}
                            />

                            {/* Info del plan actual */}
                            <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl">
                                <p className="text-xs font-semibold text-brand-900 mb-1">
                                    Plan activo: {PLAN_LABELS[userPlan]}
                                </p>
                                <p className="text-xs text-brand-700">
                                    Los módulos disponibles en este negocio dependen de tu plan de suscripción.
                                </p>
                            </div>

                            <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
                                {isPending ? <Spinner size="sm" /> : 'Crear negocio'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Preview módulos */}
                <div className="lg:col-span-2">
                    <div className="card p-5 sticky top-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Módulos incluidos
                        </p>
                        <div className="space-y-2">
                            {Object.entries(MODULE_LABELS).map(([key, { label, icon }]) => (
                                <div key={key} className="flex items-center gap-2.5">
                                    {modules[key] ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${modules[key] ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {icon} {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                ¿Necesitas más módulos?{' '}
                                <Link to="/profile" className="text-brand-600 hover:underline">
                                    Mejora tu plan
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}