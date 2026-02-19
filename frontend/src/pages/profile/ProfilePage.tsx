import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Shield, Check } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { InputField, Avatar, ErrorAlert, Spinner, Modal } from '@/components/ui'
import { getApiErrorMessage, PLAN_LABELS, formatDate } from '@/utils'
import React from 'react'
import type { SubscriptionPlan } from '@/types'

const schema = z.object({
    full_name: z.string().min(2, 'Mínimo 2 caracteres'),
    phone: z.string().optional(),
    email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

const PLAN_FEATURES: Record<SubscriptionPlan, { price: string; businesses: number; features: string[] }> = {
    free: {
        price: 'Gratis',
        businesses: 1,
        features: ['1 negocio', 'Módulos básicos', '1 usuario por negocio', '100 productos'],
    },
    basic: {
        price: '$29.900/mes',
        businesses: 3,
        features: ['3 negocios', 'Finanzas y proveedores', '5 usuarios por negocio', '500 productos'],
    },
    professional: {
        price: '$79.900/mes',
        businesses: 10,
        features: ['10 negocios', 'Todos los módulos', '20 usuarios por negocio', '2,000 productos', 'Reportes avanzados'],
    },
    enterprise: {
        price: 'Consultar',
        businesses: 999,
        features: ['Negocios ilimitados', 'Todos los módulos', 'Usuarios ilimitados', 'Productos ilimitados', 'Soporte prioritario'],
    },
}

export function ProfilePage() {
    const { user, setUser } = useAuthStore()
    const qc = useQueryClient()
    const [saved, setSaved] = React.useState(false)
    const [showPlanModal, setShowPlanModal] = React.useState(false)
    const [selectedPlan, setSelectedPlan] = React.useState<SubscriptionPlan | null>(null)

    const update = useMutation({
        mutationFn: (data: FormData) => usersApi.update(data),
        onSuccess: (updated) => {
            setUser(updated)
            qc.setQueryData(['me'], updated)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        },
    })

    const changePlan = useMutation({
        mutationFn: (plan: SubscriptionPlan) => {
            // Por ahora solo simula el cambio, el backend real requeriría integración de pagos
            // TODO: Integrar con pasarela de pago
            return usersApi.update({ subscription_plan: plan } as any)
        },
        onSuccess: (updated) => {
            setUser(updated)
            qc.setQueryData(['me'], updated)
            qc.invalidateQueries({ queryKey: ['businesses'] })
            setShowPlanModal(false)
            setSelectedPlan(null)
        },
    })

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
        resolver: zodResolver(schema),
        values: user ? {
            full_name: user.full_name ?? '',
            phone: user.phone ?? '',
            email: user.email,
        } : undefined,
    })

    if (!user) return null

    const handlePlanChange = () => {
        if (!selectedPlan) return
        changePlan.mutate(selectedPlan)
    }

    return (
        <div className="p-8 max-w-2xl mx-auto animate-fade-in">
            <h1 className="text-xl font-bold text-gray-900 mb-6">Mi perfil</h1>

            <div className="card p-6 mb-6">
                {/* Avatar + info básica */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <Avatar name={user.full_name ?? user.username} size="xl" />
                    <div>
                        <p className="text-lg font-semibold text-gray-900">
                            {user.full_name ?? user.username}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="badge badge-brand capitalize">
                                {PLAN_LABELS[user.subscription_plan]}
                            </span>
                            <span className="text-xs text-gray-400">
                                Desde {formatDate(user.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {update.error && <div className="mb-4"><ErrorAlert message={getApiErrorMessage(update.error)} /></div>}
                {saved && (
                    <div className="mb-4 p-3.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                        ✅ Perfil actualizado
                    </div>
                )}

                <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
                    <InputField
                        label="Nombre completo"
                        error={errors.full_name?.message}
                        required
                        {...register('full_name')}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Email"
                            type="email"
                            error={errors.email?.message}
                            required
                            {...register('email')}
                        />
                        <InputField
                            label="Teléfono"
                            placeholder="+57 300 000 0000"
                            {...register('phone')}
                        />
                    </div>
                    <div>
                        <p className="label">Username</p>
                        <p className="input bg-surface-50 text-gray-500 cursor-not-allowed flex items-center">
                            @{user.username}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">El username no puede cambiarse</p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={update.isPending || !isDirty}
                            className="btn-primary"
                        >
                            {update.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Plan upgrade card */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Plan de suscripción</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {PLAN_LABELS[user.subscription_plan]} - {PLAN_FEATURES[user.subscription_plan].price}
                        </p>
                    </div>
                    {user.subscription_plan !== 'enterprise' && (
                        <button onClick={() => setShowPlanModal(true)} className="btn-primary btn-sm">
                            Mejorar plan
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {PLAN_FEATURES[user.subscription_plan].features.map((f) => (
                        <span key={f} className="badge badge-brand text-xs">
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* Modal: Cambiar plan */}
            <Modal
                isOpen={showPlanModal}
                onClose={() => { setShowPlanModal(false); setSelectedPlan(null) }}
                title="Cambiar plan de suscripción"
                size="lg"
            >
                {changePlan.error && (
                    <div className="mb-4">
                        <ErrorAlert message={getApiErrorMessage(changePlan.error)} />
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    {(['free', 'basic', 'professional', 'enterprise'] as SubscriptionPlan[]).map((plan) => {
                        const isActive = user.subscription_plan === plan
                        const isSelected = selectedPlan === plan
                        const info = PLAN_FEATURES[plan]

                        return (
                            <button
                                key={plan}
                                type="button"
                                onClick={() => setSelectedPlan(plan)}
                                disabled={isActive}
                                className={`text-left p-4 rounded-xl border-2 transition-all ${isActive
                                    ? 'border-green-200 bg-green-50 cursor-not-allowed'
                                    : isSelected
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{PLAN_LABELS[plan]}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{info.price}</p>
                                    </div>
                                    {isActive && (
                                        <span className="badge badge-green text-[10px]">Actual</span>
                                    )}
                                </div>
                                <ul className="space-y-1.5">
                                    {info.features.map((f) => (
                                        <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <Check className="w-3 h-3 text-green-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        )
                    })}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowPlanModal(false); setSelectedPlan(null) }}
                        className="btn-secondary flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePlanChange}
                        disabled={!selectedPlan || changePlan.isPending || selectedPlan === user.subscription_plan}
                        className="btn-primary flex-1"
                    >
                        {changePlan.isPending ? <Spinner size="sm" /> : 'Confirmar cambio'}
                    </button>
                </div>

                <p className="text-xs text-gray-400 mt-4 text-center">
                    💡 Los cambios se aplicarán inmediatamente a todos tus negocios
                </p>
            </Modal>

            {/* Link a seguridad */}
            <Link to="/profile/security" className="card p-5 flex items-center gap-3 hover:border-gray-200 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Seguridad</p>
                    <p className="text-xs text-gray-400">Cambia tu contraseña</p>
                </div>
                <span className="text-gray-300">→</span>
            </Link>
        </div>
    )
}