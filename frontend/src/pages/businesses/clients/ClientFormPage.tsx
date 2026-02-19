import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { InputField, TextareaField, SelectField, ErrorAlert, Spinner, PageLoader } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'

export const clientSchema = z.object({
    name: z.string().nonempty(),
    client_type: z.enum(['natural', 'empresa']),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    document_id: z.string().optional(),
    notes: z.string().optional(),
    credit_limit: z.string(),   // ⚠ string para input
    credit_days: z.number(),    // ⚠ number
});

export type ClientForm = z.infer<typeof clientSchema>;

export function ClientFormPage() {
    const { id, clientId } = useParams<{ id: string; clientId?: string }>()
    const businessId = Number(id)
    const isEdit = !!clientId
    const navigate = useNavigate()

    const { data: existing, isLoading } = useClient(businessId, Number(clientId))
    const create = useCreateClient(businessId)
    const update = useUpdateClient(businessId, Number(clientId))
    const mutation = isEdit ? update : create

    const { register, handleSubmit, formState: { errors } } = useForm<ClientForm>({
        resolver: zodResolver(clientSchema),
        defaultValues: { client_type: 'natural', credit_limit: '0', credit_days: 30 },
        values: existing ? {
            name: existing.name,
            client_type: existing.client_type,
            phone: existing.phone ?? '',
            email: existing.email ?? '',
            address: existing.address ?? '',
            document_id: existing.document_id ?? '',
            notes: existing.notes ?? '',
            credit_limit: existing.credit_limit?.toString() ?? '0',
            credit_days: existing.credit_days,
        } : undefined,
    })

    const onSubmit = (data: ClientForm) => {
        mutation.mutate(data as any, {
            onSuccess: (client) => navigate(`/businesses/${id}/clients/${client.id}`),
        })
    }

    if (isEdit && isLoading) return <PageLoader />

    return (
        <div className="p-8 max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to={`/businesses/${id}/clients`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
                    <p className="text-sm text-gray-500">Completa los datos del cliente</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {mutation.error && <ErrorAlert message={getApiErrorMessage(mutation.error)} />}

                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Datos básicos</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Nombre completo" required error={errors.name?.message} {...register('name')} />
                        <SelectField
                            label="Tipo de cliente"
                            options={[{ value: 'natural', label: '👤 Persona natural' }, { value: 'empresa', label: '🏢 Empresa' }]}
                            {...register('client_type')}
                        />
                        <InputField label="Teléfono" placeholder="300 000 0000" {...register('phone')} />
                        <InputField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                        <InputField label="Dirección" {...register('address')} />
                        <InputField label="Cédula / NIT" {...register('document_id')} />
                    </div>
                    <TextareaField label="Notas internas" placeholder='Ej: "Paga los viernes", "No fiar más de $50.000"' {...register('notes')} />
                </div>

                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Configuración de crédito</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField
                            label="Límite de crédito"
                            type="number"
                            min="0"
                            placeholder="0 = sin límite"
                            hint="Monto máximo de deuda permitido. 0 = sin límite definido."
                            error={errors.credit_limit?.message}
                            {...register('credit_limit')}
                        />
                        <InputField
                            label="Días de crédito"
                            type="number"
                            min="1"
                            max="365"
                            hint="Días antes de marcar como moroso."
                            error={errors.credit_days?.message}
                            {...register('credit_days')}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Link to={`/businesses/${id}/clients`} className="btn-secondary flex-1">Cancelar</Link>
                    <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                        {mutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Guardar cambios' : 'Crear cliente'}
                    </button>
                </div>
            </form>
        </div>
    )
}