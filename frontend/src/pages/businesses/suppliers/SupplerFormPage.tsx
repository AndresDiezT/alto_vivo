import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { InputField, TextareaField, ErrorAlert, Spinner, PageLoader } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    contact_name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    address: z.string().optional(),
    document_id: z.string().optional(),
    notes: z.string().optional(),
    credit_limit: z.coerce.number().min(0),
    credit_days: z.coerce.number().min(0).max(365),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function SupplierFormPage() {
    const { id, supplierId } = useParams<{ id: string; supplierId?: string }>()
    const businessId = Number(id)
    const isEdit = !!supplierId
    const navigate = useNavigate()

    const { data: existing, isLoading } = useSupplier(businessId, Number(supplierId))
    const create = useCreateSupplier(businessId)
    const update = useUpdateSupplier(businessId, Number(supplierId))
    const mutation = isEdit ? update : create

    const { register, handleSubmit, formState: { errors } } = useForm<FormInput, any, FormData>({
        resolver: zodResolver(schema),
        defaultValues: { credit_limit: 0, credit_days: 30 },
        values: existing ? {
            name: existing.name,
            contact_name: existing.contact_name ?? '',
            phone: existing.phone ?? '',
            email: existing.email ?? '',
            address: existing.address ?? '',
            document_id: existing.document_id ?? '',
            notes: existing.notes ?? '',
            credit_limit: Number(existing.credit_limit),
            credit_days: existing.credit_days,
        } : undefined,
    })

    const onSubmit = (data: FormData) => {
        mutation.mutate(data as any, {
            onSuccess: (supplier: any) =>
                navigate(`/businesses/${id}/suppliers/${supplier.id}`),
        })
    }

    if (isEdit && isLoading) return <PageLoader />

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to={`/businesses/${id}/suppliers`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {mutation.error && <ErrorAlert message={getApiErrorMessage(mutation.error)} />}

                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Información general</h2>
                    <InputField label="Nombre *" error={errors.name?.message} {...register('name')} />
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Nombre de contacto" {...register('contact_name')} />
                        <InputField label="Teléfono" {...register('phone')} />
                        <InputField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                        <InputField label="NIT / Cédula" {...register('document_id')} />
                    </div>
                    <InputField label="Dirección" {...register('address')} />
                    <TextareaField label="Notas" {...register('notes')} />
                </div>

                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Condiciones de crédito</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Límite de crédito ($)"
                            type="number" min="0"
                            hint="0 = sin límite"
                            {...register('credit_limit')}
                        />
                        <InputField
                            label="Días de crédito"
                            type="number" min="0" max="365"
                            hint="Días para pagar"
                            {...register('credit_days')}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Link to={`/businesses/${id}/suppliers`} className="btn-secondary flex-1">Cancelar</Link>
                    <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                        {mutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
                    </button>
                </div>
            </form>
        </div>
    )
}