import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import { useBusiness, useCreateBusiness, useDeleteBusiness } from '@/hooks/useBusiness'
import { businessApi } from '@/api/business'
import {
    InputField, TextareaField, SelectField,
    ErrorAlert, Spinner, ConfirmDialog, PageLoader,
} from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    description: z.string().optional(),
    business_type: z.enum(['retail', 'restaurant', 'wholesale', 'other']),
})

type FormData = z.infer<typeof schema>

export function BusinessSettingsPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [showDelete, setShowDelete] = React.useState(false)

    const { data: business, isLoading } = useBusiness(businessId)

    const update = useMutation({
        mutationFn: (data: FormData) => businessApi.update(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['businesses', businessId] })
            qc.invalidateQueries({ queryKey: ['businesses'] })
        },
    })

    const deleteBusiness = useDeleteBusiness()

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
        resolver: zodResolver(schema),
        values: business ? {
            name: business.name,
            description: business.description ?? '',
            business_type: business.business_type,
        } : undefined,
    })

    if (isLoading) return <PageLoader />
    if (!business) return null

    const onSubmit = (data: FormData) => update.mutate(data)

    const handleDelete = () => {
        deleteBusiness.mutate(businessId, {
            onSuccess: () => navigate('/businesses'),
        })
    }

    return (
        <div className="p-8 max-w-2xl mx-auto animate-fade-in">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Configuración del negocio</h1>
                <p className="text-sm text-gray-500 mt-0.5">{business.name}</p>
            </div>

            {/* Información general */}
            <div className="card p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Información general</h2>

                {update.error && (
                    <div className="mb-4">
                        <ErrorAlert message={getApiErrorMessage(update.error)} />
                    </div>
                )}
                {update.isSuccess && (
                    <div className="mb-4 p-3.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                        Cambios guardados correctamente
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <InputField
                        label="Nombre"
                        error={errors.name?.message}
                        required
                        {...register('name')}
                    />
                    <TextareaField
                        label="Descripción"
                        {...register('description')}
                    />
                    <SelectField
                        label="Tipo de negocio"
                        options={[
                            { value: 'retail', label: 'Minorista / Tienda' },
                            { value: 'restaurant', label: 'Restaurante / Comidas' },
                            { value: 'wholesale', label: 'Mayorista' },
                            { value: 'other', label: 'Otro' },
                        ]}
                        {...register('business_type')}
                    />
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

            {/* Info del plan */}
            {/* <div className="card p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Plan actual</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-700 capitalize">{business.plan_type}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Máx. {business.max_users} usuarios · {business.max_products} productos
                        </p>
                    </div>
                    <button className="btn-secondary btn-sm">Cambiar plan</button>
                </div>
            </div> */}

            {/* Zona de peligro */}
            <div className="card p-6 border-red-100">
                <h2 className="text-sm font-semibold text-red-700 mb-3">Zona de peligro</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Al eliminar el negocio se borrarán todos sus datos permanentemente. Esta acción no se puede deshacer.
                </p>
                <button
                    onClick={() => setShowDelete(true)}
                    className="btn-danger btn-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    Eliminar negocio
                </button>
            </div>

            <ConfirmDialog
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Eliminar negocio"
                message={`¿Estás seguro de eliminar "${business.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                danger
                loading={deleteBusiness.isPending}
            />
        </div>
    )
}